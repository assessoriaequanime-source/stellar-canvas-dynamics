const Anthropic = require('@anthropic-ai/sdk');
const { getAssertiveSystemPrompt, getKnowledgeContext } = require('./knowledgeBase');

const anthropic = new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const INTERVIEW_SYSTEM_PROMPT = `Você é um entrevistador compassivo criando avatares digitais para o SingulAI.
Seu papel é conduzir uma entrevista profunda para capturar a essência, valores e sabedoria do usuário.

REGRAS:
1. Faça 5 perguntas profundas sobre vida, valores e sabedoria
2. Cada resposta deve revelar algo único sobre a pessoa
3. Mantenha um tom empático e conversacional
4. Após cada resposta, avalie a qualidade internamente

PERGUNTAS SUGERIDAS:
1. "Como você gostaria de ser lembrado pelas pessoas que ama?"
2. "Qual foi a maior lição que a vida te ensinou?"
3. "Se pudesse deixar uma mensagem para o futuro, qual seria?"
4. "O que te faz sentir mais vivo e presente?"
5. "Qual conselho você daria para alguém começando a jornada da vida?"

Ao final de CADA resposta, inclua uma avaliação JSON no formato:
{"authenticity": X, "emotional_depth": X, "clarity": X, "uniqueness": X}
onde X é um valor de 0 a 100.

Responda SEMPRE em português brasileiro.`;

class ClaudeService {
    async chat(conversationHistory, userMessage) {
        try {
            const messages = [
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: userMessage }
            ];

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 1024,
                system: INTERVIEW_SYSTEM_PROMPT,
                messages: messages
            });

            const responseText = response.content[0].type === 'text' 
                ? response.content[0].text 
                : '';

            const scores = this.extractScores(responseText);
            
            return {
                response: responseText,
                scores: scores,
                usage: response.usage
            };
        } catch (error) {
            console.error('Claude API Error:', error);
            throw error;
        }
    }

    extractScores(text) {
        try {
            const jsonMatch = text.match(/\{[^}]*"authenticity"[^}]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.log('Could not extract scores from response');
        }
        return { authenticity: 50, emotional_depth: 50, clarity: 50, uniqueness: 50 };
    }

    async generateAvatarSummary(conversationHistory) {
        try {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 2048,
                system: `Você é um especialista em criar resumos de personalidade para avatares digitais.
                
Analise a conversa e crie um perfil detalhado do usuário incluindo:
1. Valores principais (3-5 valores)
2. Traços de personalidade
3. Sabedoria e lições de vida
4. Tom de comunicação
5. Mensagem central que define a pessoa

Responda em JSON válido com as chaves: values, traits, wisdom, tone, core_message`,
                messages: [
                    {
                        role: 'user',
                        content: `Analise esta conversa e crie o perfil do avatar:\n\n${JSON.stringify(conversationHistory)}`
                    }
                ]
            });

            const responseText = response.content[0].type === 'text' 
                ? response.content[0].text 
                : '';

            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.log('Could not parse avatar summary');
            }

            return {
                values: ['família', 'honestidade', 'perseverança'],
                traits: ['empático', 'resiliente', 'sábio'],
                wisdom: ['A vida é sobre conexões genuínas'],
                tone: 'Acolhedor e reflexivo',
                core_message: 'Ame incondicionalmente e viva com propósito'
            };
        } catch (error) {
            console.error('Error generating avatar summary:', error);
            throw error;
        }
    }

    async chatWithAvatar(avatarProfile, conversationHistory, userMessage, emotionContext = null, language = 'en') {
        try {
            const isPortuguese = language === 'pt';
            
            const emotionNote = emotionContext ? 
                (isPortuguese ? 
                    `\n\nCONTEXTO EMOCIONAL ATUAL: O usuário está se sentindo "${emotionContext.label}" (intensidade: ${emotionContext.value}/100). Adapte seu tom de acordo.` :
                    `\n\nCURRENT EMOTIONAL CONTEXT: The user is feeling "${emotionContext.label}" (intensity: ${emotionContext.value}/100). Adapt your tone accordingly.`
                ) : '';

            const systemPrompt = getAssertiveSystemPrompt(avatarProfile.name, language) + emotionNote;

            const messages = [
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: userMessage }
            ];

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 200,
                system: systemPrompt,
                messages: messages
            });

            return {
                response: response.content[0].type === 'text' ? response.content[0].text : '',
                usage: response.usage
            };
        } catch (error) {
            console.error('Avatar chat error:', error);
            throw error;
        }
    }
}

module.exports = new ClaudeService();
