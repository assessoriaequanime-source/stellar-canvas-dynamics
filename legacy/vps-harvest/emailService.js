const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');
        const smtpUser = process.env.SMTP_USER || 'hello@singulai.site';
        const smtpPass = process.env.SMTP_PASS;

        if (!smtpPass) {
            console.warn('Email service: SMTP_PASS not configured');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        this.initialized = true;
        console.log('Email service initialized');
    }

    async sendWelcomeEmail(to, name) {
        console.log(`[EMAIL] sendWelcomeEmail called - to: ${to}, name: ${name}`);
        
        if (!this.transporter) {
            console.log('[EMAIL] Email service not configured, skipping email');
            return { success: false, reason: 'not_configured' };
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { background: rgba(255,255,255,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px; }
        h1 { color: #3b82f6; font-size: 24px; margin-bottom: 16px; }
        p { color: #ffffff; opacity: 0.8; line-height: 1.6; margin-bottom: 16px; }
        .highlight { color: #60a5fa; font-weight: 600; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin-top: 24px; }
        .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 40px; }
        .quote { font-style: italic; color: rgba(255,255,255,0.6); border-left: 3px solid #3b82f6; padding-left: 16px; margin: 24px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SingulAI</div>
            <p style="color: rgba(255,255,255,0.4); font-size: 12px; letter-spacing: 2px;">DIGITAL LEGACY PLATFORM</p>
        </div>
        
        <div class="content">
            <h1>Bem-vindo(a), ${name}!</h1>
            <p>Sua jornada para criar um <span class="highlight">legado digital eterno</span> começa agora.</p>
            <p>O SingulAI é mais do que uma plataforma - é uma ponte entre gerações, um guardião de memórias e valores que transcendem o tempo.</p>
            
            <div class="quote">
                "O amor que sentimos por alguém não se mede pelo tempo que passamos juntos, mas pela eternidade que desejamos construir para eles."
            </div>
            
            <p>Com o SingulAI, você pode:</p>
            <ul style="color: rgba(255,255,255,0.8);">
                <li>Criar avatares digitais que preservam sua essência</li>
                <li>Deixar mensagens para momentos especiais da vida</li>
                <li>Garantir que seu amor e sabedoria alcancem quem você ama</li>
            </ul>
            
            <center>
                <a href="https://singulai.site" class="button">Acessar SingulAI</a>
            </center>
        </div>
        
        <div class="footer">
            <p>© 2026 SingulAI - Preservando o que importa para sempre</p>
            <p>Este email foi enviado para ${to}</p>
        </div>
    </div>
</body>
</html>`;

        try {
            console.log(`[EMAIL] Attempting to send welcome email to ${to}...`);
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: `Bem-vindo ao SingulAI, ${name}! Seu legado digital começa agora`,
                html: html
            });

            console.log(`[EMAIL] Welcome email sent successfully to ${to} - messageId: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error(`[EMAIL] Error sending welcome email to ${to}:`, error.message);
            console.error(`[EMAIL] Full error:`, error);
            return { success: false, error: error.message };
        }
    }

    async sendEmailVerification(to, name, walletAddress, verificationLink) {
        console.log(`[EMAIL] sendEmailVerification called - to: ${to}, name: ${name}`);
        
        if (!this.transporter) {
            console.log('[EMAIL] Email service not configured, skipping verification email');
            return { success: false, reason: 'not_configured' };
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: rgba(15,23,42,0.95); border: 1px solid rgba(59,130,246,0.25); border-radius: 20px; padding: 28px; }
        h1 { color: #60a5fa; font-size: 26px; margin-bottom: 16px; }
        p { color: rgba(203,213,225,0.95); line-height: 1.7; margin-bottom: 16px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; }
        .footer { color: rgba(148,163,184,0.95); font-size: 12px; margin-top: 24px; }
        .code { background: rgba(255,255,255,0.08); padding: 12px 16px; border-radius: 10px; display: block; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Verifique sua wallet SingulAI</h1>
            <p>Olá ${name},</p>
            <p>Sua wallet Sepolia foi criada com sucesso. Antes de liberar seus tokens iniciais, confirme o recebimento do documento de custódia.</p>
            <p><strong>Endereço da wallet:</strong></p>
            <p class="code">${walletAddress}</p>
            <p>Para confirmar o recebimento, clique no botão abaixo:</p>
            <p style="text-align:center;"><a class="button" href="${verificationLink}">Confirmar recebimento</a></p>
            <p>Se o botão não funcionar, copie este link no navegador:</p>
            <p class="code">${verificationLink}</p>
            <div class="footer">
                <p>Nunca compartilhe sua chave privada ou frase de recuperação. A SingulAI não solicita esses dados por email.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

        try {
            console.log(`[EMAIL] Attempting to send verification email to ${to}...`);
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: 'Confirme sua wallet SingulAI e libere seus tokens SGL',
                html: html
            });

            console.log(`[EMAIL] Verification email sent successfully to ${to} - messageId: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error(`[EMAIL] Error sending verification email to ${to}:`, error.message);
            console.error(`[EMAIL] Full error:`, error);
            return { success: false, error: error.message };
        }
    }

    async sendWalletReceiptConfirmedEmail(to, name) {
        console.log(`[EMAIL] sendWalletReceiptConfirmedEmail called - to: ${to}, name: ${name}`);
        
        if (!this.transporter) {
            console.log('[EMAIL] Email service not configured, skipping receipt confirmation email');
            return { success: false, reason: 'not_configured' };
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: rgba(15,23,42,0.95); border: 1px solid rgba(34,197,94,0.25); border-radius: 20px; padding: 28px; }
        h1 { color: #34d399; font-size: 26px; margin-bottom: 16px; }
        p { color: rgba(203,213,225,0.95); line-height: 1.7; margin-bottom: 16px; }
        .footer { color: rgba(148,163,184,0.95); font-size: 12px; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Recebimento confirmado</h1>
            <p>Olá ${name},</p>
            <p>Obrigado por confirmar o recebimento do documento de custódia da sua wallet.</p>
            <p>Estamos liberando seu bônus inicial de <strong>10.000 SGL</strong> e o crédito de gás Sepolia.</p>
            <p>Em breve, sua carteira estará completamente habilitada para uso.</p>
            <div class="footer">
                <p>Se precisar de ajuda, responda a este email ou acesse o suporte.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

        try {
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: 'Recebimento da sua wallet confirmado',
                html: html
            });

            console.log(`[EMAIL] Receipt confirmation email sent successfully to ${to} - messageId: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error(`[EMAIL] Error sending receipt confirmation email to ${to}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async sendLegacyConfirmation(to, name, legacyTitle, triggerType) {
        if (!this.transporter) {
            return { success: false, reason: 'not_configured' };
        }

        const triggerLabels = {
            date: 'em uma data específica',
            age: 'quando atingir a idade definida',
            event: 'quando o evento de vida ocorrer',
            death: 'quando as condições forem confirmadas pelo Oracle'
        };

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { background: rgba(255,255,255,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #3b82f6; font-size: 24px; margin-bottom: 16px; }
        p { color: #ffffff; opacity: 0.8; line-height: 1.6; }
        .highlight { color: #60a5fa; font-weight: 600; }
        .legacy-card { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 12px; padding: 20px; margin: 24px 0; }
        .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SingulAI</div>
        </div>
        
        <div class="content">
            <h1>Legado Criado com Sucesso</h1>
            <p>Olá ${name},</p>
            <p>Seu legado digital foi registrado e está aguardando as condições de liberação.</p>
            
            <div class="legacy-card">
                <p style="margin: 0;"><strong>Título:</strong> <span class="highlight">${legacyTitle}</span></p>
                <p style="margin: 8px 0 0 0;"><strong>Liberação:</strong> ${triggerLabels[triggerType] || 'condições definidas'}</p>
            </div>
            
            <p>Quando as condições forem atendidas, o destinatário receberá sua mensagem. Este é o seu legado - uma parte de você que permanecerá para sempre.</p>
        </div>
        
        <div class="footer">
            <p>© 2026 SingulAI - Preservando o que importa para sempre</p>
        </div>
    </div>
</body>
</html>`;

        try {
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: `Legado "${legacyTitle}" criado com sucesso - SingulAI`,
                html: html
            });

            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending legacy confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    async sendLegacyNotification(to, recipientName, senderName, legacyTitle, accessCode, walletAddress) {
        if (!this.transporter) {
            return { success: false, reason: 'not_configured' };
        }

        const accessLink = `https://singulai.site/legacy.html?code=${accessCode || ''}`;
        const whatsappText = encodeURIComponent(`${senderName} me deixou um legado digital! 💙\n\nTítulo: "${legacyTitle}"\n\nAcesse aqui: ${accessLink}\n\nChave: ${accessCode || 'N/A'}`);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { background: rgba(255,255,255,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #3b82f6; font-size: 24px; margin-bottom: 16px; }
        p { color: #ffffff; opacity: 0.8; line-height: 1.6; }
        .highlight { color: #60a5fa; font-weight: 600; }
        .key-box { background: rgba(0,0,0,0.5); border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px dashed #3b82f6; }
        .private-key { font-family: monospace; font-size: 11px; word-break: break-all; color: #60a5fa; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin-top: 24px; }
        .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SingulAI</div>
            <p style="color: rgba(255,255,255,0.4); font-size: 14px;">Uma mensagem especial para você</p>
        </div>
        
        <div class="content">
            <h1>Olá, ${recipientName}</h1>
            <p>Você recebeu um <span class="highlight">legado digital</span> de <strong>${senderName}</strong>.</p>
            <p>Esta é uma mensagem especial que foi preparada com muito amor e carinho, aguardando o momento certo para chegar até você.</p>
            <p style="font-size: 18px; color: #60a5fa;"><strong>"${legacyTitle}"</strong></p>
            
            ${accessCode ? `
            <div class="key-box">
                <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Sua chave de acesso:</strong></p>
                <div class="private-key">${accessCode}</div>
            </div>
            ` : ''}
            
            <center>
                <a href="${accessLink}" class="button">ACESSAR MEU LEGADO</a>
            </center>
            
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <p style="font-size: 13px; opacity: 0.7; margin-bottom: 12px;">Prefere acessar pelo celular?</p>
                <a href="https://wa.me/?text=${whatsappText}" 
                   style="display: inline-block; background: #25D366; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                    📱 Enviar link para meu WhatsApp
                </a>
            </div>
            
            ${walletAddress ? `<p style="font-size: 12px; margin-top: 24px; opacity: 0.6; text-align: center;">Wallet: ${walletAddress}</p>` : ''}
        </div>
        
        <div class="footer">
            <p>© 2026 SingulAI - Preservando o que importa para sempre</p>
        </div>
    </div>
</body>
</html>`;

        try {
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: `${senderName} deixou uma mensagem especial para você`,
                html: html
            });

            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending legacy notification:', error);
            return { success: false, error: error.message };
        }
    }

    async sendCapsuleDelivery(to, recipientName, senderName, title, accessCode, walletAddress) {
        if (!this.transporter) {
            return { success: false, reason: 'not_configured' };
        }

        const accessLink = `https://singulai.site/capsule.html?code=${accessCode}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #f59e0b, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #f59e0b; font-size: 24px; margin-bottom: 16px; }
        p { color: #ffffff; opacity: 0.8; line-height: 1.6; }
        .key-box { background: rgba(0,0,0,0.5); border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px dashed #f59e0b; }
        .private-key { font-family: monospace; font-size: 11px; word-break: break-all; color: #f59e0b; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; user-select: all; }
        .button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; margin-top: 24px; font-size: 16px; }
        .steps { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 20px 0; }
        .step { display: flex; align-items: flex-start; margin: 8px 0; }
        .step-num { background: #f59e0b; color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 12px; flex-shrink: 0; }
        .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SingulAI</div>
            <p style="color: rgba(255,255,255,0.4); font-size: 14px;">Time Capsule</p>
        </div>
        
        <div class="content">
            <h1>Hello, ${recipientName}!</h1>
            <p><strong>${senderName}</strong> has sent you a special time capsule.</p>
            <p style="font-size: 18px; color: #f59e0b; margin: 20px 0;"><strong>"${title}"</strong></p>
            
            <div class="steps">
                <div class="step"><span class="step-num">1</span><span>Click the button below</span></div>
                <div class="step"><span class="step-num">2</span><span>Copy the access key and paste it in the field</span></div>
                <div class="step"><span class="step-num">3</span><span>Done! View your message</span></div>
            </div>
            
            <div class="key-box">
                <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Your access key (copy everything):</strong></p>
                <div class="private-key">${accessCode}</div>
            </div>
            
            <center>
                <a href="${accessLink}" class="button">OPEN MY CAPSULE</a>
            </center>
            
            <p style="font-size: 12px; margin-top: 24px; opacity: 0.6; text-align: center;">
                Temporary wallet address: ${walletAddress}
            </p>
        </div>
        
        <div class="footer">
            <p>This capsule was scheduled to reach you at this special moment.</p>
            <p>© 2026 SingulAI - Preserving what matters forever</p>
        </div>
    </div>
</body>
</html>`;

        try {
            const result = await this.transporter.sendMail({
                from: '"SingulAI Capsules" <hello@singulai.site>',
                to: to,
                subject: `${senderName} has sent you a message: "${title}"`,
                html: html
            });

            console.log(`Capsule email sent to ${to}: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending capsule delivery:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWalletCredentials(to, name, pdfBuffer) {
        if (!this.transporter) {
            return { success: false, reason: 'not_configured' };
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .content { background: rgba(255,255,255,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 16px; padding: 32px; }
        h1 { color: #3b82f6; font-size: 24px; margin-bottom: 16px; }
        p { color: #ffffff; opacity: 0.8; line-height: 1.6; }
        .warning { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); border-radius: 8px; padding: 16px; margin: 20px 0; }
        .warning p { color: #FF6B6B; margin: 0; }
        .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SingulAI</div>
        </div>
        
        <div class="content">
            <h1>Suas Credenciais de Wallet</h1>
            <p>Olá ${name},</p>
            <p>Em anexo estão as credenciais da sua wallet na rede Sepolia Testnet.</p>
            
            <div class="warning">
                <p><strong>IMPORTANTE:</strong> Este documento contém sua chave privada e frase de recuperação. Nunca compartilhe com ninguém. Guarde em local seguro.</p>
            </div>
            
            <p>Para receber ETH de teste gratuito, acesse: sepoliafaucet.com</p>
        </div>
        
        <div class="footer">
            <p>© 2026 SingulAI - Preservando o que importa para sempre</p>
        </div>
    </div>
</body>
</html>`;

        try {
            const result = await this.transporter.sendMail({
                from: '"SingulAI" <hello@singulai.site>',
                to: to,
                subject: 'Suas Credenciais de Wallet - SingulAI',
                html: html,
                attachments: [{
                    filename: 'singulai-wallet-credentials.pdf',
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }]
            });

            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending wallet credentials:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyConnection() {
        if (!this.transporter) {
            return { success: false, reason: 'not_configured' };
        }

        try {
            await this.transporter.verify();
            return { success: true };
        } catch (error) {
            console.error('SMTP verification failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
