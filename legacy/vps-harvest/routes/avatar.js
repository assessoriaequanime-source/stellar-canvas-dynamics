const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');
const blockchainService = require('../services/blockchainService');
const xaiService = require('../services/xaiService');

const avatarChatSessions = new Map();

setInterval(() => {
    const maxAge = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, session] of avatarChatSessions) {
        if (now - session.startedAt > maxAge) {
            avatarChatSessions.delete(id);
        }
    }
}, 15 * 60 * 1000);

const defaultAvatarProfiles = {
    pedro: { name: 'Pedro' },
    laura: { name: 'Laura' },
    leticia: { name: 'Letícia' }
};

router.get('/', (req, res) => {
    try {
        const avatars = storageService.getAllAvatars();
        res.json({
            success: true,
            count: avatars.length,
            avatars: avatars.map(a => ({
                id: a.id,
                name: a.name,
                status: a.status,
                coesion: a.coesion.omega,
                createdAt: a.createdAt
            }))
        });
    } catch (error) {
        console.error('Error getting avatars:', error);
        res.status(500).json({ error: 'Falha ao obter avatares' });
    }
});

router.get('/:avatarId', (req, res) => {
    try {
        const { avatarId } = req.params;
        const avatar = storageService.getAvatar(avatarId);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar não encontrado' });
        }

        res.json({
            success: true,
            avatar: {
                id: avatar.id,
                name: avatar.name,
                profile: avatar.profile,
                coesion: avatar.coesion,
                status: avatar.status,
                metadataHash: avatar.metadataHash,
                createdAt: avatar.createdAt
            }
        });
    } catch (error) {
        console.error('Error getting avatar:', error);
        res.status(500).json({ error: 'Falha ao obter avatar' });
    }
});

router.post('/:avatarId/deploy', async (req, res) => {
    try {
        const { avatarId } = req.params;
        const avatar = storageService.getAvatar(avatarId);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar não encontrado' });
        }

        const tx = await blockchainService.createAvatar(
            avatar.name,
            avatar.metadataHash
        );

        res.json({
            success: true,
            message: tx.verified ? 'Avatar registrado na blockchain com sucesso' : 'Avatar registrado (simulação)',
            transaction: tx,
            avatar: {
                id: avatar.id,
                name: avatar.name,
                metadataHash: avatar.metadataHash
            }
        });
    } catch (error) {
        console.error('Error deploying avatar:', error);
        res.status(500).json({ error: 'Falha ao registrar avatar na blockchain' });
    }
});

router.get('/:avatarId/legacies', (req, res) => {
    try {
        const { avatarId } = req.params;
        const avatar = storageService.getAvatar(avatarId);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar não encontrado' });
        }

        const legacies = storageService.getLegaciesByAvatar(avatarId);

        res.json({
            success: true,
            count: legacies.length,
            legacies: legacies.map(l => ({
                id: l.id,
                recipient: l.recipient,
                triggerType: l.triggerType,
                triggerDate: l.triggerDate,
                status: l.status,
                createdAt: l.createdAt
            }))
        });
    } catch (error) {
        console.error('Error getting avatar legacies:', error);
        res.status(500).json({ error: 'Falha ao obter legados do avatar' });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const { profile, message, sessionId, emotionContext, language, userId } = req.body;
        
        if (!message || !profile) {
            return res.status(400).json({ error: 'Message and profile are required' });
        }

        const userLanguage = language || 'en';
        const chatSessionId = sessionId || `avatar_${profile}_${Date.now()}`;
        
        let session = avatarChatSessions.get(chatSessionId);
        if (!session) {
            session = { 
                history: [],
                profile: profile,
                language: userLanguage,
                userId: userId,
                startedAt: Date.now()
            };
            avatarChatSessions.set(chatSessionId, session);
        }

        const avatarKey = profile.toLowerCase();
        const avatarProfile = defaultAvatarProfiles[avatarKey] || defaultAvatarProfiles.pedro;
        const effectiveUserId = userId || session.userId || chatSessionId;

        const result = await xaiService.chatWithAvatar(
            avatarKey,
            session.history,
            message,
            emotionContext,
            session.language || userLanguage,
            effectiveUserId
        );

        session.history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: result.response }
        );

        if (session.history.length > 30) {
            session.history = session.history.slice(-30);
        }

        const usage = await xaiService.getDailyUsage(effectiveUserId);

        res.json({
            success: true,
            sessionId: chatSessionId,
            response: result.response,
            messageCount: session.history.length / 2,
            avatarName: avatarProfile.name,
            dailyUsage: usage,
            limited: result.limited || false
        });

    } catch (error) {
        console.error('Error in avatar chat:', error);
        res.status(500).json({ error: 'Falha ao processar mensagem do avatar' });
    }
});

router.get('/usage/:userId', async (req, res) => {
    try {
        const usage = await xaiService.getDailyUsage(req.params.userId);
        res.json({ success: true, usage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get usage' });
    }
});

router.delete('/chat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    avatarChatSessions.delete(sessionId);
    res.json({ success: true, message: 'Sessão encerrada' });
});

module.exports = router;
