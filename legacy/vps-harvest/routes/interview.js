const express = require('express');
const router = express.Router();
const claudeService = require('../services/claudeService');
const coesionService = require('../services/coesionService');
const storageService = require('../services/storageService');

router.post('/start', async (req, res) => {
    try {
        const { userId } = req.body;
        const session = await storageService.createSession(userId);
        
        const welcomeMessage = `Olá! Sou seu guia para criar seu Avatar Digital no SingulAI.

Através de uma conversa profunda, vou aprender sobre seus valores, sabedoria e essência para criar uma representação digital autêntica de quem você é.

Vamos começar: **Como você gostaria de ser lembrado pelas pessoas que ama?**`;

        storageService.addMessage(session.id, 'assistant', welcomeMessage);

        res.json({
            success: true,
            sessionId: session.id,
            message: welcomeMessage,
            coesion: {
                omega: 0,
                status: 'INITIALIZING',
                particles: 0
            }
        });
    } catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ error: 'Falha ao iniciar entrevista' });
    }
});

router.post('/message', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!sessionId || !message) {
            return res.status(400).json({ error: 'sessionId e message são obrigatórios' });
        }

        const session = storageService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        storageService.addMessage(sessionId, 'user', message);

        const response = await claudeService.chat(session.conversationHistory, message);

        storageService.addMessage(sessionId, 'assistant', response.response, response.scores);

        const updatedSession = storageService.getSession(sessionId);
        const coesion = coesionService.calculateFromConversation(
            updatedSession.conversationHistory,
            response.scores
        );

        storageService.updateSession(sessionId, { coesion });

        res.json({
            success: true,
            response: response.response,
            scores: response.scores,
            coesion: {
                omega: coesion.omega,
                omegaPercent: (coesion.omega * 100).toFixed(1),
                status: coesion.status,
                particles: coesion.particles,
                isSovereign: coesionService.isSovereign(coesion.omega)
            },
            messageCount: updatedSession.conversationHistory.length
        });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Falha ao processar mensagem' });
    }
});

router.get('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = storageService.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                messageCount: session.conversationHistory.length,
                coesion: session.coesion,
                avatarId: session.avatarId,
                createdAt: session.createdAt
            }
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Falha ao obter sessão' });
    }
});

router.post('/finalize', async (req, res) => {
    try {
        const { sessionId, avatarName } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId é obrigatório' });
        }

        const session = storageService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        const profile = await claudeService.generateAvatarSummary(session.conversationHistory);

        const avatar = storageService.createAvatar(
            sessionId, 
            avatarName || 'Meu Avatar Digital',
            profile
        );

        res.json({
            success: true,
            avatar: {
                id: avatar.id,
                name: avatar.name,
                profile: avatar.profile,
                coesion: avatar.coesion,
                metadataHash: avatar.metadataHash,
                status: avatar.status
            }
        });
    } catch (error) {
        console.error('Error finalizing interview:', error);
        res.status(500).json({ error: 'Falha ao finalizar entrevista' });
    }
});

module.exports = router;
