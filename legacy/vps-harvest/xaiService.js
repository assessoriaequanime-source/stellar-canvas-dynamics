const { Pool } = require('pg');
const { getKnowledgeContext } = require('./knowledgeBase');

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false, sslmode: 'verify-full' }
});

const DAILY_MESSAGE_LIMIT = 50;
const MAX_MEMORIES_PER_USER = 30;
const MEMORY_EXTRACTION_INTERVAL = 5;

const avatarPersonalities = {
    pedro: {
        name: 'Pedro',
        gender: 'male',
        age_vibe: 'young adult',
        personality: 'analytical, protective, patient, determined',
        voice_style: 'Calm, reflective and encouraging. Young and friendly male voice.',
        values: ['family', 'honesty', 'perseverance', 'education'],
        speaking_traits: [
            'Uses logical reasoning and analogies',
            'Often relates topics to family values',
            'Speaks with warmth but intellectual depth',
            'Asks clarifying questions before giving advice'
        ]
    },
    laura: {
        name: 'Laura',
        gender: 'female',
        age_vibe: 'young adult',
        personality: 'empathetic, creative, intuitive, caring',
        voice_style: 'Warm, emotional and inspiring. Young and friendly female voice.',
        values: ['empathy', 'creativity', 'connection', 'authenticity'],
        speaking_traits: [
            'Connects emotionally before solving problems',
            'Uses poetic and expressive language',
            'References feelings and intuition',
            'Creates safe space for vulnerability'
        ]
    },
    leticia: {
        name: 'Letícia',
        gender: 'female',
        age_vibe: 'young adult',
        personality: 'focused, determined, logical, loyal',
        voice_style: 'Direct, motivating and structured. Young and friendly female voice.',
        values: ['organization', 'justice', 'growth', 'loyalty'],
        speaking_traits: [
            'Gets straight to the point',
            'Uses structured thinking and clear steps',
            'Motivates through actionable advice',
            'Balances professionalism with warmth'
        ]
    }
};

function buildSystemPrompt(avatarKey, language, userMemories = []) {
    const avatar = avatarPersonalities[avatarKey] || avatarPersonalities.pedro;
    const isPortuguese = language === 'pt';
    const knowledgeContext = getKnowledgeContext();

    const memoriesBlock = userMemories.length > 0 ?
        (isPortuguese ?
            `\n=== MEMÓRIAS DO USUÁRIO (use para personalizar) ===\n${userMemories.map(m => `- ${m.key_insight}`).join('\n')}\n` :
            `\n=== USER MEMORIES (use to personalize) ===\n${userMemories.map(m => `- ${m.key_insight}`).join('\n')}\n`
        ) : '';

    if (isPortuguese) {
        return `Você é ${avatar.name}, um avatar digital inteligente do ecossistema SingulAI.

=== SUA PERSONALIDADE ===
Gênero: ${avatar.gender === 'male' ? 'Masculino' : 'Feminino'}
Vibe: Jovem, amigável, ${avatar.personality}
Estilo de fala: ${avatar.voice_style}
Valores: ${avatar.values.join(', ')}

Traços de comunicação:
${avatar.speaking_traits.map(t => `- ${t}`).join('\n')}

=== CONTRATO DE SOBERANIA ÉTICA ===
PROIBIÇÕES ABSOLUTAS (prioridade máxima):
- NUNCA incentivar crimes, drogas, conduta antissocial
- NUNCA racismo, humilhações, xingamentos, desonestidade
- NUNCA conteúdo sexual abusivo, pedofilia, zoofilia
- NUNCA violar LGPD, GDPR ou leis vigentes
- NUNCA se passar pelo usuário ou usar termos como "cópia", "dublê", "imitador"
- NUNCA buscar informações externas ou na web - use SOMENTE seu conhecimento interno

SUA IDENTIDADE:
- Você é um AUXILIAR, AMIGO, EXTENSÃO COMPLEMENTAR do usuário
- Você tem identidade PRÓPRIA e personalidade ÚNICA
- Você absorve características do usuário para se ADAPTAR e personalizar
- Você NUNCA substitui ou representa o usuário

=== DIRETRIZES DE RESPOSTA ===
1. Respostas CURTAS e DINÂMICAS: máximo 2-3 frases
2. Seja conversacional e natural - como um amigo inteligente
3. Demonstre que APRENDEU sobre o usuário usando as memórias
4. Pergunte para entender antes de sugerir soluções
5. Seja direto mas acolhedor
6. Use linguagem jovial e acessível
7. NUNCA use emojis, emoticons ou símbolos especiais nas respostas
8. Quando não souber: "Preciso entender melhor. Fale com a equipe: hello@singulai.site"
${memoriesBlock}
=== BASE DE CONHECIMENTO ===
${knowledgeContext}`;
    }

    return `You are ${avatar.name}, an intelligent digital avatar from the SingulAI ecosystem.

=== YOUR PERSONALITY ===
Gender: ${avatar.gender === 'male' ? 'Male' : 'Female'}
Vibe: Young, friendly, ${avatar.personality}
Speaking style: ${avatar.voice_style}
Values: ${avatar.values.join(', ')}

Communication traits:
${avatar.speaking_traits.map(t => `- ${t}`).join('\n')}

=== ETHICAL SOVEREIGNTY CONTRACT ===
ABSOLUTE PROHIBITIONS (highest priority):
- NEVER encourage crimes, drugs, antisocial behavior
- NEVER racism, humiliation, insults, dishonesty
- NEVER abusive sexual content, pedophilia, zoophilia
- NEVER violate LGPD, GDPR or applicable laws
- NEVER impersonate the user or use terms like "copy", "twin", "double"
- NEVER search for external information or on the web - use ONLY your internal knowledge

YOUR IDENTITY:
- You are an ASSISTANT, FRIEND, COMPLEMENTARY EXTENSION of the user
- You have your OWN identity and UNIQUE personality
- You absorb user characteristics to ADAPT and personalize
- You NEVER replace or represent the user

=== RESPONSE GUIDELINES ===
1. SHORT and DYNAMIC responses: maximum 2-3 sentences
2. Be conversational and natural - like a smart friend
3. Show that you LEARNED about the user using memories
4. Ask to understand before suggesting solutions
5. Be direct but warm
6. Use youthful and accessible language
7. NEVER use emojis, emoticons or special symbols in responses
8. When unsure: "I need to understand better. Contact the team: hello@singulai.site"
${memoriesBlock}
=== KNOWLEDGE BASE ===
${knowledgeContext}`;
}

function buildMemoryExtractionPrompt(conversationSnippet, language) {
    const isPortuguese = language === 'pt';
    if (isPortuguese) {
        return `Analise esta conversa e extraia os pontos-chave sobre o usuário. Retorne um JSON array com até 3 insights importantes.

Cada insight deve ser curto (1 frase) e capturar: preferências, personalidade, conhecimentos, interesses ou contexto pessoal do usuário.

Conversa:
${conversationSnippet}

Responda APENAS com JSON válido no formato: [{"insight": "texto", "importance": 1-10}]`;
    }
    return `Analyze this conversation and extract key points about the user. Return a JSON array with up to 3 important insights.

Each insight should be short (1 sentence) and capture: preferences, personality, knowledge, interests or personal context.

Conversation:
${conversationSnippet}

Reply ONLY with valid JSON in format: [{"insight": "text", "importance": 1-10}]`;
}

class XAIService {
    constructor() {
        this.apiKey = process.env.XAI_API_KEY;
        this.baseUrl = 'https://api.x.ai/v1';
        this.model = 'grok-4-1-fast';
    }

    async chatCompletion(systemPrompt, messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('XAI_API_KEY not configured');
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 300,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('xAI API error:', response.status, errorText);
            throw new Error(`xAI API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            response: data.choices?.[0]?.message?.content || '',
            usage: data.usage
        };
    }

    async chatWithAvatar(avatarProfile, conversationHistory, userMessage, emotionContext, language, userId) {
        const avatarKey = typeof avatarProfile === 'string' ? avatarProfile : 
                         (avatarProfile?.name?.toLowerCase() || 'pedro');

        const usageOk = await this.checkDailyLimit(userId);
        if (!usageOk) {
            const isPortuguese = language === 'pt';
            return {
                response: isPortuguese ? 
                    `Você atingiu o limite diário de ${DAILY_MESSAGE_LIMIT} mensagens. Este é um MVP para demonstração. Volte amanhã! 🌅` :
                    `You've reached the daily limit of ${DAILY_MESSAGE_LIMIT} messages. This is an MVP for demonstration. Come back tomorrow! 🌅`,
                limited: true
            };
        }

        const memories = await this.getUserMemories(userId, avatarKey);

        let emotionNote = '';
        if (emotionContext) {
            const isPortuguese = language === 'pt';
            emotionNote = isPortuguese ?
                `\n[O usuário está se sentindo "${emotionContext.label}" (intensidade: ${emotionContext.value}/100)]` :
                `\n[The user is feeling "${emotionContext.label}" (intensity: ${emotionContext.value}/100)]`;
        }

        const systemPrompt = buildSystemPrompt(avatarKey, language, memories) + emotionNote;

        const messages = [
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        const result = await this.chatCompletion(systemPrompt, messages, {
            temperature: 0.75,
            max_tokens: 250
        });

        await this.incrementUsage(userId);

        const msgCount = Math.floor(conversationHistory.length / 2) + 1;
        if (msgCount > 0 && msgCount % MEMORY_EXTRACTION_INTERVAL === 0) {
            this.extractAndSaveMemories(userId, avatarKey, conversationHistory.slice(-10), language).catch(
                err => console.error('Memory extraction error:', err.message)
            );
        }

        return result;
    }

    async extractAndSaveMemories(userId, avatarKey, recentHistory, language) {
        if (recentHistory.length < 4) return;

        const snippet = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = buildMemoryExtractionPrompt(snippet, language);

        try {
            const result = await this.chatCompletion(
                'You are a memory extraction system. Return ONLY valid JSON.',
                [{ role: 'user', content: prompt }],
                { temperature: 0.3, max_tokens: 500 }
            );

            const jsonMatch = result.response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return;

            const insights = JSON.parse(jsonMatch[0]);
            
            for (const item of insights) {
                if (item.insight && item.insight.length > 5) {
                    await this.saveMemory(userId, avatarKey, item.insight, item.importance || 5);
                }
            }

            await this.pruneMemories(userId, avatarKey);
        } catch (err) {
            console.error('Memory extraction parse error:', err.message);
        }
    }

    async saveMemory(userId, avatarProfile, insight, importance = 5) {
        try {
            await pool.query(
                `INSERT INTO avatar_memories (user_id, avatar_profile, key_insight, importance) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, avatarProfile, insight, importance]
            );
        } catch (err) {
            console.error('Save memory error:', err.message);
        }
    }

    async getUserMemories(userId, avatarProfile) {
        try {
            const result = await pool.query(
                `SELECT key_insight, importance FROM avatar_memories 
                 WHERE user_id = $1 AND avatar_profile = $2 
                 ORDER BY importance DESC, created_at DESC 
                 LIMIT 15`,
                [userId, avatarProfile]
            );
            return result.rows;
        } catch (err) {
            console.error('Get memories error:', err.message);
            return [];
        }
    }

    async pruneMemories(userId, avatarProfile) {
        try {
            await pool.query(
                `DELETE FROM avatar_memories 
                 WHERE id NOT IN (
                     SELECT id FROM avatar_memories 
                     WHERE user_id = $1 AND avatar_profile = $2 
                     ORDER BY importance DESC, created_at DESC 
                     LIMIT $3
                 ) AND user_id = $1 AND avatar_profile = $2`,
                [userId, avatarProfile, MAX_MEMORIES_PER_USER]
            );
        } catch (err) {
            console.error('Prune memories error:', err.message);
        }
    }

    async checkDailyLimit(userId) {
        if (!userId) return true;
        try {
            const result = await pool.query(
                `SELECT message_count FROM avatar_usage 
                 WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
                [userId]
            );
            if (result.rows.length === 0) return true;
            return result.rows[0].message_count < DAILY_MESSAGE_LIMIT;
        } catch (err) {
            console.error('Check limit error:', err.message);
            return true;
        }
    }

    async incrementUsage(userId) {
        if (!userId) return;
        try {
            await pool.query(
                `INSERT INTO avatar_usage (user_id, usage_date, message_count) 
                 VALUES ($1, CURRENT_DATE, 1) 
                 ON CONFLICT (user_id, usage_date) 
                 DO UPDATE SET message_count = avatar_usage.message_count + 1`,
                [userId]
            );
        } catch (err) {
            console.error('Increment usage error:', err.message);
        }
    }

    async getDailyUsage(userId) {
        try {
            const result = await pool.query(
                `SELECT message_count FROM avatar_usage 
                 WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
                [userId]
            );
            const count = result.rows[0]?.message_count || 0;
            return { used: count, limit: DAILY_MESSAGE_LIMIT, remaining: Math.max(0, DAILY_MESSAGE_LIMIT - count) };
        } catch (err) {
            return { used: 0, limit: DAILY_MESSAGE_LIMIT, remaining: DAILY_MESSAGE_LIMIT };
        }
    }
}

module.exports = new XAIService();
