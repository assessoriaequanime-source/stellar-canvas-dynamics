const express = require('express');
const router = express.Router();
const walletService = require('../services/walletService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const storageService = require('../services/storageService');

router.get('/sgl-balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const onChainBalance = await walletService.getSGLBalanceOnChain(address);
        const transactions = walletService.getSGLTransactions(address);
        const dbTransactions = await storageService.getTransactionsByWallet(address);
        
        const allTransactions = [...transactions];
        for (const dbTx of dbTransactions) {
            const exists = allTransactions.some(t => t.hash === dbTx.tx_hash);
            if (!exists) {
                allTransactions.push({
                    hash: dbTx.tx_hash,
                    blockNumber: dbTx.block_number,
                    from: dbTx.from_address,
                    to: dbTx.to_address,
                    amount: parseFloat(dbTx.amount),
                    type: dbTx.tx_type,
                    timestamp: dbTx.created_at,
                    status: 'confirmed'
                });
            }
        }
        
        allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            address,
            balance: onChainBalance,
            symbol: 'SGL',
            network: 'Sepolia ETH Testnet',
            tokenAddress: '0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1',
            transactions: allTransactions.slice(0, 10)
        });
    } catch (error) {
        console.error('Error getting SGL balance:', error);
        res.status(500).json({ error: 'Falha ao obter saldo SGL' });
    }
});

router.post('/create', async (req, res) => {
    try {
        const { userId, userName, email } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }

        const wallet = await walletService.createUserWallet(userId);
        const balance = await walletService.checkBalance(wallet.address);

        try {
            await storageService.createUser({
                id: userId,
                email: email || null,
                name: userName || null,
                walletAddress: wallet.address,
                walletEncryptedKey: wallet.privateKey,
                walletMnemonic: wallet.mnemonic,
                sglBalance: wallet.sglBalance || 10000
            });

            if (wallet.sglTxHash) {
                await storageService.saveTransaction({
                    walletAddress: wallet.address,
                    txHash: wallet.sglTxHash,
                    blockNumber: wallet.sglBlockNumber,
                    from: process.env.SGL_DISTRIBUTOR_ADDRESS || '0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb',
                    to: wallet.address,
                    amount: wallet.sglBalance || 10000,
                    type: 'initial_distribution'
                });
            }
        } catch (dbError) {
            console.error('Error saving to database:', dbError);
        }

        res.status(201).json({
            success: true,
            message: 'Wallet criada com sucesso na Sepolia Testnet',
            wallet: {
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic,
                network: wallet.network,
                balance: balance.formatted,
                explorerUrl: wallet.explorerUrl,
                sglBalance: wallet.sglBalance,
                sglTxHash: wallet.sglTxHash,
                sglBlockNumber: wallet.sglBlockNumber
            },
            instructions: {
                faucet: 'Para receber ETH de teste, acesse sepoliafaucet.com',
                import: 'Para importar no MetaMask, use a chave privada ou frase de recuperação'
            }
        });

    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ error: 'Falha ao criar wallet' });
    }
});

router.post('/provisional', async (req, res) => {
    try {
        const { capsuleId, recipientName } = req.body;
        
        if (!capsuleId || !recipientName) {
            return res.status(400).json({ error: 'capsuleId e recipientName são obrigatórios' });
        }

        const provisional = walletService.createProvisionalWallet(capsuleId, recipientName);

        res.status(201).json({
            success: true,
            message: 'Wallet provisória criada para o destinatário',
            provisional: {
                accessCode: provisional.accessCode,
                address: provisional.address,
                accessUrl: provisional.accessUrl,
                recipientName: provisional.recipientName
            },
            note: 'O destinatário pode acessar a cápsula com este código. Após visualizar, pode criar conta permanente ou descartar.'
        });

    } catch (error) {
        console.error('Error creating provisional wallet:', error);
        res.status(500).json({ error: 'Falha ao criar wallet provisória' });
    }
});

router.get('/provisional/:accessCode', (req, res) => {
    try {
        const { accessCode } = req.params;
        const result = walletService.getProvisionalWallet(accessCode);

        if (!result.success) {
            return res.status(404).json({ error: result.error });
        }

        res.json({
            success: true,
            wallet: result.wallet
        });

    } catch (error) {
        console.error('Error getting provisional wallet:', error);
        res.status(500).json({ error: 'Falha ao acessar wallet provisória' });
    }
});

router.post('/revoke', (req, res) => {
    try {
        const { capsuleId, reason } = req.body;
        
        if (!capsuleId) {
            return res.status(400).json({ error: 'capsuleId é obrigatório' });
        }

        const result = walletService.revokeCapsuleAccess(capsuleId, reason);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            message: result.message,
            oldAddress: result.oldAddress,
            note: 'O destinatário anterior não terá mais acesso à cápsula'
        });

    } catch (error) {
        console.error('Error revoking access:', error);
        res.status(500).json({ error: 'Falha ao revogar acesso' });
    }
});

router.post('/redirect', (req, res) => {
    try {
        const { capsuleId, newRecipientName } = req.body;
        
        if (!capsuleId || !newRecipientName) {
            return res.status(400).json({ error: 'capsuleId e newRecipientName são obrigatórios' });
        }

        const result = walletService.redirectCapsule(capsuleId, newRecipientName);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            message: result.message,
            newAccessCode: result.newAccessCode,
            newAddress: result.newAddress,
            accessUrl: result.accessUrl
        });

    } catch (error) {
        console.error('Error redirecting capsule:', error);
        res.status(500).json({ error: 'Falha ao redirecionar cápsula' });
    }
});

router.post('/convert', (req, res) => {
    try {
        const { accessCode, userId, email } = req.body;
        
        if (!accessCode || !userId || !email) {
            return res.status(400).json({ error: 'accessCode, userId e email são obrigatórios' });
        }

        const result = walletService.convertProvisionalToUser(accessCode, userId, email);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            message: result.message,
            wallet: result.wallet
        });

    } catch (error) {
        console.error('Error converting wallet:', error);
        res.status(500).json({ error: 'Falha ao converter wallet' });
    }
});

router.post('/discard', (req, res) => {
    try {
        const { accessCode } = req.body;
        
        if (!accessCode) {
            return res.status(400).json({ error: 'accessCode é obrigatório' });
        }

        const result = walletService.discardProvisionalWallet(accessCode);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error discarding wallet:', error);
        res.status(500).json({ error: 'Falha ao descartar wallet' });
    }
});

router.get('/:userId/credentials', (req, res) => {
    try {
        const { userId } = req.params;
        const result = walletService.getWalletCredentials(userId);

        if (!result.success) {
            return res.status(404).json({ error: result.error });
        }

        res.json({
            success: true,
            credentials: {
                address: result.address,
                privateKey: result.privateKey,
                mnemonic: result.mnemonic,
                network: result.network,
                chainId: result.chainId,
                explorerUrl: result.explorerUrl
            }
        });

    } catch (error) {
        console.error('Error getting credentials:', error);
        res.status(500).json({ error: 'Falha ao obter credenciais' });
    }
});

router.get('/:userId/credentials/pdf', async (req, res) => {
    try {
        const { userId } = req.params;
        const { userName } = req.query;
        
        const credentials = walletService.getWalletCredentials(userId);
        
        if (!credentials.success) {
            return res.status(404).json({ error: credentials.error });
        }

        const pdfBuffer = await pdfService.generateWalletCredentialsPDF(
            {
                address: credentials.address,
                privateKey: credentials.privateKey,
                mnemonic: credentials.mnemonic
            },
            userName || 'Usuário'
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="singulai-wallet-${credentials.address.slice(0, 8)}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Falha ao gerar PDF' });
    }
});

router.post('/:userId/credentials/email', async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, userName } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const credentials = walletService.getWalletCredentials(userId);
        
        if (!credentials.success) {
            return res.status(404).json({ error: credentials.error });
        }

        const pdfBuffer = await pdfService.generateWalletCredentialsPDF(
            {
                address: credentials.address,
                privateKey: credentials.privateKey,
                mnemonic: credentials.mnemonic
            },
            userName || 'Usuário'
        );

        const emailResult = await emailService.sendWalletCredentials(email, userName || 'Usuário', pdfBuffer);

        res.json({
            success: emailResult.success,
            message: emailResult.success ? 'Credenciais enviadas por email' : 'Falha ao enviar email',
            error: emailResult.error
        });

    } catch (error) {
        console.error('Error sending credentials email:', error);
        res.status(500).json({ error: 'Falha ao enviar credenciais' });
    }
});

router.get('/:userId/balance', async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = walletService.getUserWallet(userId);
        
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet não encontrada' });
        }

        const balance = await walletService.checkBalance(wallet.address);

        res.json({
            success: true,
            address: wallet.address,
            balance: balance.formatted,
            raw: balance.balance
        });

    } catch (error) {
        console.error('Error checking balance:', error);
        res.status(500).json({ error: 'Falha ao verificar saldo' });
    }
});

module.exports = router;
