const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const storageService = require('../services/storageService');
const walletService = require('../services/walletService');

const googleStates = new Map();
const INITIAL_SGL_BONUS = 10000;

function generateEmailVerificationToken() {
    return crypto.randomBytes(20).toString('hex');
}

function getEmailVerificationLink(token) {
    return `https://singulai.site/api/auth/verify-email?token=${token}`;
}

async function processEmailVerification(token) {
    if (!token) {
        return {
            status: 400,
            body: { error: 'Token de verificação é obrigatório' }
        };
    }

    const user = await storageService.getUserByEmailVerificationToken(token);
    if (!user) {
        return {
            status: 400,
            body: { error: 'Token de verificação inválido ou expirado' }
        };
    }

    if (user.emailVerified) {
        return {
            status: 200,
            body: {
                success: true,
                message: 'Email já verificado',
                emailVerified: true,
                bonusSent: user.firstBonusSent
            }
        };
    }

    await storageService.markUserEmailVerified(user.id);

    let bonusResult = null;
    if (!user.firstBonusSent) {
        bonusResult = await walletService.awardFirstLoginBonus(user);
        if (bonusResult.success) {
            await storageService.markUserFirstBonusSent(user.id);
            await storageService.updateUser(user.id, {
                sglBalance: (user.sglBalance || 0) + INITIAL_SGL_BONUS
            });
            if (bonusResult.txHash) {
                await storageService.saveTransaction({
                    walletAddress: user.walletAddress,
                    txHash: bonusResult.txHash,
                    blockNumber: null,
                    from: process.env.SGL_DISTRIBUTOR_ADDRESS || '0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb',
                    to: user.walletAddress,
                    amount: INITIAL_SGL_BONUS,
                    type: 'initial_distribution'
                });
            }

            (async () => {
                try {
                    await emailService.sendWalletReceiptConfirmedEmail(user.email, user.name);
                } catch (emailError) {
                    console.error('Error sending wallet receipt confirmation email:', emailError);
                }
            })();
        } else {
            console.error('Bonus distribution failed on email verification:', bonusResult.error);
        }
    }

    return {
        status: 200,
        body: {
            success: true,
            message: 'Email verificado com sucesso',
            emailVerified: true,
            bonusDistributed: bonusResult?.success || false,
            bonusSent: bonusResult?.success || user.firstBonusSent
        }
    };
}


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function getGoogleRedirectUri(req) {
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    
    if (host.includes('singulai.site')) {
        return 'https://singulai.site/api/auth/google/callback';
    }
    
    if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    }
    
    return `${protocol}://${host}/api/auth/google/callback`;
}

function generateSessionToken() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, country } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Name, email and password are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }
        
        if (!country) {
            return res.status(400).json({ 
                error: 'Country is required for data protection compliance' 
            });
        }

        const existingUser = await storageService.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ 
                error: 'This email is already registered' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const verificationToken = generateEmailVerificationToken();

        const walletData = await walletService.createUserWallet(userId, { distributeTokens: false });

        const user = await storageService.createUser({
            id: userId,
            name,
            email,
            passwordHash: hashedPassword,
            country,
            walletAddress: walletData.address,
            walletEncryptedKey: walletData.encryptedPrivateKey,
            walletMnemonic: walletData.encryptedMnemonic,
            sglBalance: 0,
            emailVerificationToken: verificationToken,
            emailVerified: false,
            firstBonusSent: false
        });

        const session = await storageService.createSession(user.id);
        const sessionToken = session.id;

        res.status(201).json({
            success: true,
            message: 'Cadastro realizado com sucesso!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress
            },
            wallet: {
                address: walletData.address,
                privateKey: walletData.privateKey,
                mnemonic: walletData.mnemonic,
                network: walletData.network,
                explorerUrl: walletData.explorerUrl
            },
            sessionToken,
            emailVerificationRequired: true,
            bonusPending: true
        });

        (async () => {
            try {
                const verificationLink = getEmailVerificationLink(verificationToken);
                await emailService.sendEmailVerification(email, name, walletData.address, verificationLink);
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
            }
        })();

    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ error: 'Falha no cadastro' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email e senha são obrigatórios' 
            });
        }

        const user = await storageService.getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Credenciais inválidas' 
            });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ error: "Esta conta usa login Google. Clique em \"Entrar com Google\"." });
        }
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Credenciais inválidas' 
            });
        }

        const session = await storageService.createSession(user.id);
        const sessionToken = session.id;
        const emailVerified = user.emailVerified || false;
        const bonusPending = !user.firstBonusSent;

        if (emailVerified && !user.firstBonusSent) {
            (async () => {
                try {
                    const bonusResult = await walletService.awardFirstLoginBonus(user);
                    if (bonusResult.success) {
                        await storageService.markUserFirstBonusSent(user.id);
                        await storageService.updateUser(user.id, {
                            sglBalance: (user.sglBalance || 0) + INITIAL_SGL_BONUS
                        });
                        if (bonusResult.txHash) {
                            await storageService.saveTransaction({
                                walletAddress: user.walletAddress,
                                txHash: bonusResult.txHash,
                                blockNumber: null,
                                from: process.env.SGL_DISTRIBUTOR_ADDRESS || '0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb',
                                to: user.walletAddress,
                                amount: INITIAL_SGL_BONUS,
                                type: 'initial_distribution'
                            });
                        }
                    } else {
                        console.error('Initial bonus distribution failed at login:', bonusResult.error);
                    }
                } catch (error) {
                    console.error('Error distributing initial bonus at login:', error);
                }
            })();
        }

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            sessionToken,
            emailVerified,
            bonusPending,
            bonusSent: user.firstBonusSent
        });

    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Falha no login' });
    }
});

router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    const result = await processEmailVerification(token);
    return res.status(result.status).json(result.body);
});

router.post('/verify-email', async (req, res) => {
    const { token } = req.body;
    const result = await processEmailVerification(token);
    return res.status(result.status).json(result.body);
});

router.post('/link-wallet', async (req, res) => {
    try {
        const { sessionToken, walletAddress } = req.body;
        
        if (!sessionToken || !walletAddress) {
            return res.status(400).json({ error: 'Token e endereço da wallet são obrigatórios' });
        }

        const session = await storageService.getSessionFromDB(sessionToken);
        if (!session) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        const user = await storageService.getUserById(session.user_id);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        await storageService.updateUser(user.id, { walletAddress });

        res.json({
            success: true,
            message: 'Wallet vinculada com sucesso',
            walletAddress
        });
    } catch (error) {
        console.error('Error linking wallet:', error);
        res.status(500).json({ error: 'Erro ao vincular wallet' });
    }
});

router.post('/verify-session', async (req, res) => {
    try {
        const { sessionToken } = req.body;
        
        if (!sessionToken) {
            return res.status(400).json({ valid: false });
        }

        const session = await storageService.getSessionFromDB(sessionToken);
        if (!session) {
            return res.status(401).json({ valid: false });
        }

        const user = await storageService.getUserById(session.user_id);
        if (!user) {
            return res.status(401).json({ valid: false });
        }

        res.json({
            valid: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress
            }
        });
    } catch (error) {
        res.status(500).json({ valid: false });
    }
});

router.post('/logout', async (req, res) => {
    const { sessionToken } = req.body;
    if (sessionToken) {
        await storageService.deleteSession(sessionToken);
    }
    res.json({ success: true });
});

router.get('/verify-email', async (req, res) => {
    try {
        const result = await emailService.verifyConnection();
        res.json({
            success: result.success,
            message: result.success ? 'Conexão SMTP verificada' : 'Falha na verificação SMTP',
            error: result.error
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar email' });
    }
});

router.post('/test-email', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await emailService.sendWelcomeEmail(email, name || 'Usuário');
        
        res.json({
            success: result.success,
            messageId: result.messageId,
            error: result.error
        });
    } catch (error) {
        console.error('Error testing email:', error);
        res.status(500).json({ error: 'Falha ao enviar email de teste' });
    }
});

router.get('/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google OAuth não configurado' });
    }
    
    const state = `state_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    googleStates.set(state, { createdAt: Date.now() });
    
    setTimeout(() => googleStates.delete(state), 600000);
    
    const redirectUri = getGoogleRedirectUri(req);
    
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'email profile',
        state: state,
        access_type: 'offline',
        prompt: 'consent'
    });
    
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            return res.redirect('/avatar.html?error=google_denied');
        }
        
        if (!state || !googleStates.has(state)) {
            return res.redirect('/avatar.html?error=invalid_state');
        }
        googleStates.delete(state);
        
        const redirectUri = getGoogleRedirectUri(req);
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            return res.redirect('/avatar.html?error=token_failed');
        }
        
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        
        const googleUser = await userResponse.json();
        
        if (!googleUser.email) {
            return res.redirect('/avatar.html?error=no_email');
        }
        
        let user = await storageService.getUserByEmail(googleUser.email);
        let isNewUser = false;
        
        if (!user) {
            isNewUser = true;
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            user = await storageService.createUser({
                id: userId,
                name: googleUser.name || googleUser.email.split('@')[0],
                email: googleUser.email,
                googleId: googleUser.id
            });
            
            try {
                const walletData = await walletService.createUserWallet(userId);
                await storageService.updateUser(userId, { walletAddress: walletData.address });
                user.walletAddress = walletData.address;
            } catch (walletError) {
                console.error('Error creating wallet for Google user:', walletError);
            }
            
            emailService.sendWelcomeEmail(googleUser.email, user.name).catch(console.error);
        }
        
        const session = await storageService.createSession(user.id);
        const sessionToken = session.id;

        const redirectUser = {
            id: user.id,
            name: user.name || googleUser.name || googleUser.email.split('@')[0],
            email: user.email || googleUser.email,
            walletAddress: user.walletAddress || null
        };

        const redirectUrl =
            '/avatar.html?auth=google' +
            '&session=' + encodeURIComponent(sessionToken) +
            '&user=' + encodeURIComponent(JSON.stringify(redirectUser)) +
            '&wallet=' + encodeURIComponent(JSON.stringify({ address: redirectUser.walletAddress }));

        console.log('Redirecting Google user to avatar:', redirectUrl.slice(0, 220) + '...');
        return res.redirect(redirectUrl);
        
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/avatar.html?error=oauth_failed');
    }
});

module.exports = router;
