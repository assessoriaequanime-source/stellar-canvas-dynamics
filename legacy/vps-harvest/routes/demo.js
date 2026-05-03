const express = require('express');
const router = express.Router();
const xaiService = require('../services/xaiService');

const demoSessions = new Map();
const ipTracker = new Map();
const isDev = !!(process.env.REPL_SLUG || process.env.REPLIT_DEV_DOMAIN);
const DEMO_MSG_LIMIT = 8;
const IP_MAX_REQUESTS_PER_HOUR = isDev ? 500 : 30;
const IP_BLOCK_DURATION = isDev ? 60 * 1000 : 2 * 60 * 60 * 1000;
const IP_BURST_LIMIT = isDev ? 50 : 5;

setInterval(() => {
    const now = Date.now();
    for (const [id, session] of demoSessions) {
        if (now - session.startedAt > 30 * 60 * 1000) {
            demoSessions.delete(id);
        }
    }
    for (const [ip, data] of ipTracker) {
        if (now - data.windowStart > IP_BLOCK_DURATION && !data.blocked) {
            ipTracker.delete(ip);
        }
        if (data.blocked && now - data.blockedAt > IP_BLOCK_DURATION) {
            ipTracker.delete(ip);
        }
    }
}, 5 * 60 * 1000);

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.ip;
}

function checkIPLimit(ip) {
    const now = Date.now();
    let data = ipTracker.get(ip);

    if (!data) {
        data = { requests: [], windowStart: now, blocked: false, blockedAt: null };
        ipTracker.set(ip, data);
    }

    if (data.blocked) {
        const elapsed = now - data.blockedAt;
        if (elapsed < IP_BLOCK_DURATION) {
            return { allowed: false, retryAfter: Math.ceil((IP_BLOCK_DURATION - elapsed) / 1000) };
        }
        data.blocked = false;
        data.blockedAt = null;
        data.requests = [];
        data.windowStart = now;
    }

    data.requests = data.requests.filter(t => now - t < 60 * 60 * 1000);

    if (data.requests.length >= IP_MAX_REQUESTS_PER_HOUR) {
        data.blocked = true;
        data.blockedAt = now;
        return { allowed: false, retryAfter: Math.ceil(IP_BLOCK_DURATION / 1000) };
    }

    const recentRequests = data.requests.filter(t => now - t < 10000);
    if (recentRequests.length >= IP_BURST_LIMIT) {
        data.blocked = true;
        data.blockedAt = now;
        return { allowed: false, retryAfter: Math.ceil(IP_BLOCK_DURATION / 1000) };
    }

    data.requests.push(now);
    return { allowed: true };
}

router.post('/chat', async (req, res) => {
    try {
        const clientIP = getClientIP(req);

        const { consentToken } = req.body;
        if (!consentToken || typeof consentToken !== 'string') {
            return res.status(403).json({ success: false, error: 'Consent required before using demo chat' });
        }
        const tokenData = consentTokens.get(consentToken);
        if (!tokenData) {
            return res.status(403).json({ success: false, error: 'Invalid or expired consent token. Please accept the consent again.' });
        }

        const ipCheck = checkIPLimit(clientIP);

        if (!ipCheck.allowed) {
            return res.status(429).json({
                success: false,
                blocked: true,
                retryAfter: ipCheck.retryAfter,
                error: 'Too many requests. Please create an account for unlimited access.'
            });
        }

        const { profile, message, sessionId, language } = req.body;

        if (!message || !profile) {
            return res.status(400).json({ success: false, error: 'Message and profile are required' });
        }

        if (message.length > 500) {
            return res.status(400).json({ success: false, error: 'Message too long' });
        }

        const sid = sessionId || `demo_${Date.now()}`;
        let session = demoSessions.get(sid);
        if (!session) {
            session = {
                history: [],
                profile: profile,
                language: language || 'en',
                msgCount: 0,
                startedAt: Date.now(),
                ip: clientIP
            };
            demoSessions.set(sid, session);
        }

        if (session.ip !== clientIP) {
            return res.status(403).json({ success: false, error: 'Session mismatch' });
        }

        session.msgCount++;
        if (session.msgCount > DEMO_MSG_LIMIT) {
            return res.status(429).json({
                success: false,
                limitReached: true,
                error: 'Demo message limit reached'
            });
        }

        const avatarKey = profile.toLowerCase();
        const demoUserId = `demo_${sid}`;

        const result = await xaiService.chatWithAvatar(
            avatarKey,
            session.history,
            message,
            null,
            session.language || language || 'en',
            demoUserId
        );

        session.history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: result.response }
        );

        if (session.history.length > 16) {
            session.history = session.history.slice(-16);
        }

        res.json({
            success: true,
            sessionId: sid,
            response: result.response,
            messageCount: session.msgCount,
            remaining: DEMO_MSG_LIMIT - session.msgCount
        });

    } catch (error) {
        console.error('Error in demo chat:', error);
        res.status(500).json({ success: false, error: 'Failed to process message' });
    }
});

const consentLog = [];
const consentTokens = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [token, data] of consentTokens) {
        if (now - data.createdAt > 60 * 60 * 1000) {
            consentTokens.delete(token);
        }
    }
}, 10 * 60 * 1000);

router.post('/consent', (req, res) => {
    try {
        const clientIP = getClientIP(req);
        const { timestamp, consent, regulations, language, token, action } = req.body;

        if (action === 'declined') {
            consentLog.push({
                ip: clientIP,
                action: 'declined',
                language: typeof language === 'string' ? language.slice(0, 5) : 'en',
                serverTimestamp: new Date().toISOString()
            });

            if (consentLog.length > 1000) {
                consentLog.splice(0, consentLog.length - 1000);
            }

            console.log(`[CONSENT:DECLINED] IP: ${clientIP} | Lang: ${language}`);
            return res.json({ success: true, recorded: true, action: 'declined' });
        }

        if (!token || typeof token !== 'string' || token.length > 50) {
            return res.status(400).json({ success: false, error: 'Invalid consent token' });
        }

        if (!Array.isArray(consent) || !Array.isArray(regulations)) {
            return res.status(400).json({ success: false, error: 'Invalid consent data format' });
        }

        const validRegulations = ['LGPD', 'GDPR', 'CCPA'];
        const filteredRegulations = regulations.filter(r => typeof r === 'string' && validRegulations.includes(r));

        const validConsents = ['ip_tracking', 'session_data', 'usage_analytics'];
        const filteredConsent = consent.filter(c => typeof c === 'string' && validConsents.includes(c));

        consentTokens.set(token, {
            ip: clientIP,
            createdAt: Date.now()
        });

        consentLog.push({
            ip: clientIP,
            action: 'accepted',
            timestamp: typeof timestamp === 'string' ? timestamp.slice(0, 30) : new Date().toISOString(),
            consent: filteredConsent,
            regulations: filteredRegulations,
            language: typeof language === 'string' ? language.slice(0, 5) : 'en',
            token: token,
            serverTimestamp: new Date().toISOString()
        });

        if (consentLog.length > 1000) {
            consentLog.splice(0, consentLog.length - 1000);
        }

        console.log(`[CONSENT:ACCEPTED] IP: ${clientIP} | Regulations: ${filteredRegulations.join(', ')} | Lang: ${language}`);

        res.json({ success: true, recorded: true, action: 'accepted' });
    } catch (error) {
        console.error('Error recording consent:', error);
        res.status(500).json({ success: false, error: 'Failed to record consent' });
    }
});

router.get('/consent/log', (req, res) => {
    res.json({ success: true, total: consentLog.length, recent: consentLog.slice(-50) });
});

module.exports = router;
