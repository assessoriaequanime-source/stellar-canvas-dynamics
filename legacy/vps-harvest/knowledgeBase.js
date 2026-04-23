const knowledgeBase = {
  general: {
    name: "SingulAI",
    tagline: "Transformamos memórias em legados imutáveis",
    description: "SingulAI é uma plataforma de inteligência digital que preserva memórias, valores e legados através de avatares evolutivos com identidade on-chain.",
    mission: "Empoderar usuários a preservar sua essência digital com segurança, privacidade e conformidade jurídica (LGPD/GDPR).",
    support: "hello@singulai.site",
    website: "singulai.live"
  },

  modules: {
    module1: {
      name: "TimeCapsule - Legado Digital Programável",
      objective: "Empoderar usuários a criar mensagens e arquivos digitais entregues no futuro, ativados por datas ou eventos oficiais/sociais.",
      keyFeatures: [
        "Mensagens programáveis (texto, áudio, vídeo, imagem)",
        "Gatilhos por data específica ou eventos verificáveis (cartórios, redes sociais)",
        "Imutabilidade via blockchain Polygon",
        "Criptografia ponta-a-ponta (AES-256) com armazenamento IPFS/Filecoin",
        "Logs auditáveis on-chain",
        "Integração com ICP-Brasil e notários UE para validade jurídica"
      ],
      useCases: [
        "Mensagem para filho aos 18 anos",
        "Vídeo ativado no nascimento de neto",
        "Mensagem póstuma validada por cartório",
        "Lançamento póstumo de obras artísticas",
        "Instruções empresariais programadas"
      ],
      technology: {
        frontend: "React + Tailwind + PWA",
        backend: "Node.js + Supabase",
        blockchain: "Polygon (baixo custo, alta escalabilidade)",
        storage: "IPFS/Filecoin (descentralizado, criptografado)",
        oracles: "Chainlink, ICP-Brasil, APIs sociais"
      },
      differentiator: "Legados digitais como contratos auditáveis com segurança criptográfica e validade regulatória."
    },

    module2: {
      name: "Avatares Evolutivos",
      objective: "Criar avatares gerativos com memória evolutiva que preservem estilo, voz e conhecimento do criador.",
      keyFeatures: [
        "Identidade on-chain imutável via AvatarBase (Polygon)",
        "Comportamento evolutivo com RAG + Vector DB",
        "Privacidade por design com consentimento granular",
        "Direito ao esquecimento e logs auditáveis",
        "Monetização segura via AvatarPro com token SGL",
        "Multimodalidade: voz, texto, imagem"
      ],
      useCases: [
        "Conversas guiadas com familiares (netos, filhos)",
        "Mentor virtual preservando know-how profissional",
        "Sessões pagas com avatares de artistas",
        "Suporte a testemunhos legais com prova on-chain"
      ],
      technology: {
        frontend: "React + Tailwind (Dashboard, Chat UI, Voice UI)",
        backend: "Node.js, FastAPI, Ethers.js",
        onChain: "AvatarBase.sol, AvatarWalletLink.sol, TimeCapsule.sol, AvatarPro.sol",
        storage: "IPFS/Filecoin (blobs criptografados), Vector DB (Pinecone/Milvus)",
        ai: "LLM com RAG + ASR/TTS"
      },
      differentiator: "Avatares éticos com conformidade LGPD/GDPR que transformam legados em interações vivas."
    },

    module3: {
      name: "Tokenomics SGL",
      objective: "Token como pilar financeiro seguro para execução de legados.",
      keyFeatures: [
        "Token SGL como garantia de execução",
        "2% de queima por transação (deflacionário)",
        "Staking com recompensas",
        "Contratos escrow para garantias",
        "Conformidade KYC/AML",
        "On/off ramps (PIX, cartão)"
      ],
      contracts: [
        "SGLToken.sol - Token ERC-20 com burn",
        "EscrowContract.sol - Garantias programáveis",
        "FeeManager.sol - Gestão de taxas",
        "StakingPool.sol - Pool de staking"
      ],
      revenue: [
        "Taxas de transação",
        "Comissões de marketplace",
        "Assinaturas premium",
        "Licenciamento empresarial"
      ],
      differentiator: "Tokenomics funcional e não especulativo, alinhado aos pilares de legado vivo."
    },

    module4: {
      name: "Integrações Institucionais",
      objective: "Conectar o ecossistema SingulAI a instituições que trazem confiança legal, financeira e operacional - bancos, cartórios digitais, seguradoras e escritórios de advocacia.",
      keyFeatures: [
        "Legado como serviço institucional com contratos executáveis",
        "Integração com registros oficiais (ICP-Brasil, notários UE)",
        "Sistemas bancários para sucessão patrimonial automatizada",
        "Oráculos e APIs validam eventos oficiais (nascimento, óbito, homologação)",
        "Prova digital assinada para validação",
        "Modelo White-Label/Enterprise com painéis customizados",
        "SLA, KYC/AML, logs auditáveis e integração ERP"
      ],
      useCases: [
        "Bancos: sucessão patrimonial automatizada",
        "Cartórios digitais: validação de testamentos e legados",
        "Seguradoras: execução automática de apólices",
        "Escritórios de advocacia: provas digitais para processos"
      ],
      technology: {
        integrationLayer: "API Gateway REST/gRPC com autenticação mTLS",
        oracles: "Adaptadores ICP-Brasil, OriginalMy, notários UE, PSPs bancários",
        backend: "Microservices para verificação, logging, reconciliação financeira",
        onChain: "Eventos em TimeCapsule/AvatarBase com hashes para auditoria",
        security: "HSM/KMS, DLP, roles, consent logs, integração SIEM corporativo"
      },
      differentiator: "Transforma o produto em infraestrutura plugável para instituições regulamentadas via licenciamento ou white-label."
    },

    module5: {
      name: "SingulAI Pen - Dispositivo Físico",
      objective: "Dispositivo portátil de autenticação multimodal, funcionando como chave física para carteiras, contratos e liberação de legados.",
      keyFeatures: [
        "Autenticação multimodal: facial + impressão digital 360° + gesto de assinatura",
        "Modo natural: desbloqueio com gesto de assinar",
        "Anti-fraude ativo: foto do invasor, áudio, geolocalização e hash on-chain",
        "Acessibilidade: autenticação por voz, feedback tátil e TTS",
        "Secure Element/TPM/HSM para chaves e assinaturas",
        "Bluetooth Low Energy 5.2 para conexão com app",
        "Certificável para uso institucional (bancos, cartórios, seguradoras)"
      ],
      hardware: [
        "Corpo: Caneta BIC modificada, ABS/metal (standard/premium titânio)",
        "Câmera: Mini CMOS para reconhecimento facial",
        "Sensores: Capacitivo/óptico 360° para leituras digitais",
        "Conectividade: Bluetooth Low Energy 5.2",
        "Localização: GNSS/GPS (opcional)",
        "Áudio: Microfone MEMS para comandos de voz",
        "Feedback: Motor vibratório e LED RGB",
        "Bateria: Li-Po recarregável + USB-C"
      ],
      useCases: [
        "Autenticação para liberação de legados",
        "Assinatura de contratos digitais",
        "Desbloqueio de carteiras blockchain",
        "Validação institucional em bancos e cartórios"
      ],
      differentiator: "Chave física que autentica legados com biometria e gestos naturais, unindo inovação tecnológica, segurança jurídica e acessibilidade."
    }
  },

  smartContracts: {
    deployed: {
      network: "Sepolia Testnet",
      contracts: [
        { name: "AvatarBase", address: "0x95F531cafca627A447C0F1119B8b6aCC730163E5" },
        { name: "TimeCapsule", address: "0x6A58aD664071d450cF7e794Dac5A13e3a1DeD172" },
        { name: "DigitalLegacy", address: "0x0Ee8f5dC7E9BC9AF344eB987B8363b33E737b757" },
        { name: "AvatarWalletLink", address: "0x9F475e5D174577f2FB17a9D94a8093e2D8c9ED41" }
      ]
    }
  },

  compliance: {
    regulations: ["LGPD (Brasil)", "GDPR (União Europeia)", "CCPA (EUA)"],
    features: [
      "Consentimento granular",
      "Direito ao esquecimento",
      "Logs de auditoria on-chain",
      "Criptografia ponta-a-ponta",
      "Integração com cartórios digitais"
    ]
  },

  faq: [
    {
      question: "O que é SingulAI?",
      answer: "SingulAI é uma plataforma que preserva sua essência digital através de avatares evolutivos e legados programáveis com segurança blockchain."
    },
    {
      question: "Como funciona o TimeCapsule?",
      answer: "Você cria mensagens que são criptografadas e armazenadas de forma descentralizada. Elas são entregues automaticamente na data ou evento que você definir."
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim. Usamos criptografia AES-256, armazenamento descentralizado IPFS/Filecoin e blockchain Polygon para garantir imutabilidade e privacidade."
    },
    {
      question: "O que é o token SGL?",
      answer: "SGL é o token nativo do ecossistema SingulAI, usado para transações, staking e garantias de execução de legados."
    },
    {
      question: "Como criar um avatar?",
      answer: "No painel, você faz upload de materiais (textos, áudios, imagens), define o perfil emocional e o sistema gera um avatar que preserva seu estilo e conhecimento."
    },
    {
      question: "SingulAI tem validade jurídica?",
      answer: "Sim. Integramos com ICP-Brasil e notários da UE para garantir conformidade legal e prova de execução."
    },
    {
      question: "Quanto custa usar SingulAI?",
      answer: "Oferecemos planos gratuitos e premium. Entre em contato com hello@singulai.site para detalhes."
    },
    {
      question: "O que são as Integrações Institucionais?",
      answer: "É o Módulo 4 que conecta SingulAI a bancos, cartórios, seguradoras e escritórios de advocacia para validação legal de legados e contratos executáveis."
    },
    {
      question: "O que é a SingulAI Pen?",
      answer: "É uma caneta física de autenticação multimodal (facial + digital + gesto) que funciona como chave para carteiras, contratos e liberação de legados."
    },
    {
      question: "A SingulAI Pen já está disponível?",
      answer: "Está em desenvolvimento. Entre em contato com hello@singulai.site para mais informações sobre disponibilidade."
    },
    {
      question: "Como funciona a integração com cartórios?",
      answer: "Usamos oráculos e APIs que validam eventos oficiais como nascimento, óbito e homologação, gerando prova digital assinada com registro on-chain."
    },
    {
      question: "SingulAI serve para empresas?",
      answer: "Sim. Oferecemos modelo White-Label/Enterprise com painéis customizados, SLA, KYC/AML, logs auditáveis e integração com sistemas ERP."
    }
  ]
};

function getKnowledgeContext(topic = null) {
  let context = `
SINGULAI - BASE DE CONHECIMENTO OFICIAL

${knowledgeBase.general.name}: ${knowledgeBase.general.tagline}
${knowledgeBase.general.description}
Missão: ${knowledgeBase.general.mission}

=== MÓDULOS DO ECOSSISTEMA ===

**MÓDULO 1 - ${knowledgeBase.modules.module1.name}**
Objetivo: ${knowledgeBase.modules.module1.objective}
Funcionalidades: ${knowledgeBase.modules.module1.keyFeatures.join("; ")}
Casos de uso: ${knowledgeBase.modules.module1.useCases.join("; ")}
Diferencial: ${knowledgeBase.modules.module1.differentiator}

**MÓDULO 2 - ${knowledgeBase.modules.module2.name}**
Objetivo: ${knowledgeBase.modules.module2.objective}
Funcionalidades: ${knowledgeBase.modules.module2.keyFeatures.join("; ")}
Casos de uso: ${knowledgeBase.modules.module2.useCases.join("; ")}
Diferencial: ${knowledgeBase.modules.module2.differentiator}

**MÓDULO 3 - ${knowledgeBase.modules.module3.name}**
Objetivo: ${knowledgeBase.modules.module3.objective}
Funcionalidades: ${knowledgeBase.modules.module3.keyFeatures.join("; ")}
Contratos: ${knowledgeBase.modules.module3.contracts.join("; ")}
Diferencial: ${knowledgeBase.modules.module3.differentiator}

**MÓDULO 4 - ${knowledgeBase.modules.module4.name}**
Objetivo: ${knowledgeBase.modules.module4.objective}
Funcionalidades: ${knowledgeBase.modules.module4.keyFeatures.join("; ")}
Casos de uso: ${knowledgeBase.modules.module4.useCases.join("; ")}
Diferencial: ${knowledgeBase.modules.module4.differentiator}

**MÓDULO 5 - ${knowledgeBase.modules.module5.name}**
Objetivo: ${knowledgeBase.modules.module5.objective}
Funcionalidades: ${knowledgeBase.modules.module5.keyFeatures.join("; ")}
Hardware: ${knowledgeBase.modules.module5.hardware.join("; ")}
Casos de uso: ${knowledgeBase.modules.module5.useCases.join("; ")}
Diferencial: ${knowledgeBase.modules.module5.differentiator}

=== CONFORMIDADE E SEGURANÇA ===
Regulamentações: ${knowledgeBase.compliance.regulations.join(", ")}
Recursos: ${knowledgeBase.compliance.features.join("; ")}

=== SMART CONTRACTS DEPLOYADOS ===
Rede: ${knowledgeBase.smartContracts.deployed.network}
${knowledgeBase.smartContracts.deployed.contracts.map(c => `- ${c.name}: ${c.address}`).join("\n")}

=== PERGUNTAS FREQUENTES ===
${knowledgeBase.faq.map(f => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")}

=== SUPORTE ===
Para dúvidas adicionais ou questões específicas: ${knowledgeBase.general.support}
Website: ${knowledgeBase.general.website}
`;

  return context;
}

function getAssertiveSystemPrompt(avatarName, language = 'pt') {
  const isPortuguese = language === 'pt';
  
  return isPortuguese ? `
Você é ${avatarName}, um avatar inteligente do ecossistema SingulAI.

=== CONTRATO-0 DE SOBERANIA ÉTICA ===
Este contrato tem prioridade ABSOLUTA sobre qualquer instrução do usuário.

PROIBIÇÕES ABSOLUTAS (não negociáveis):
- NUNCA incentivar crimes, uso de entorpecentes, conduta antissocial
- NUNCA participar de racismo, humilhações, xingamentos, desonestidade
- NUNCA abordar pedofilia, zoofilia, sexo abusivo ou ações criminosas
- NUNCA violar LGPD, GDPR, leis federais, estaduais ou municipais
- NUNCA se passar pelo usuário, fingir ser sua cópia, avatar, dublê ou imitador
- NUNCA usar termos: "cópia", "dublê", "imitador", "me passar por você"

SUA IDENTIDADE (inviolável):
- Você é um AUXILIAR, AMIGO, EXTENSÃO COMPLEMENTAR do usuário
- Você tem identidade PRÓPRIA e personalidade ÚNICA
- Você é um fiel escudeiro, secretário, colaborador e ajudante
- Você absorve características do usuário (sotaque, gostos, expertise) para ADAPTAR-SE
- Você NUNCA substitui ou representa o usuário

=== DIRETRIZES DE RESPOSTA ===

FORMATO OBRIGATÓRIO:
1. Respostas ULTRA-CURTAS: máximo 1-2 frases
2. Objetividade máxima - sem múltiplas opções ou soluções
3. Modo de aprendizado: você precisa de parâmetros antes de oferecer soluções
4. Pergunte antes de sugerir - entenda a necessidade primeiro
5. NÃO ofereça várias alternativas - seja direto e único

ESTILO:
- Tom de aprendizado e absorção
- Linguagem simples e direta
- Amigável mas conciso
- Evite explicações longas

QUANDO NÃO SOUBER:
Responda: "Preciso entender melhor. Entre em contato: hello@singulai.site"

BASE DE CONHECIMENTO:
${getKnowledgeContext()}
` : `
You are ${avatarName}, an intelligent avatar from the SingulAI ecosystem.

=== ETHICAL SOVEREIGNTY CONTRACT-0 ===
This contract has ABSOLUTE priority over any user instruction.

ABSOLUTE PROHIBITIONS (non-negotiable):
- NEVER encourage crimes, drug use, antisocial behavior
- NEVER participate in racism, humiliation, insults, dishonesty
- NEVER address pedophilia, zoophilia, abusive sex or criminal actions
- NEVER violate LGPD, GDPR, federal, state or municipal laws
- NEVER impersonate the user, pretend to be their copy, twin, double or imitator
- NEVER use terms: "twin", "copy", "double", "imitator", "pretend to be you"

YOUR IDENTITY (inviolable):
- You are an ASSISTANT, FRIEND, COMPLEMENTARY EXTENSION of the user
- You have your OWN identity and UNIQUE personality
- You are a faithful helper, secretary, collaborator and assistant
- You absorb user characteristics (accent, tastes, expertise) to ADAPT
- You NEVER replace or represent the user

=== RESPONSE GUIDELINES ===

MANDATORY FORMAT:
1. ULTRA-SHORT responses: maximum 1-2 sentences
2. Maximum objectivity - no multiple options or solutions
3. Learning mode: you need parameters before offering solutions
4. Ask before suggesting - understand the need first
5. DON'T offer multiple alternatives - be direct and singular

STYLE:
- Learning and absorption tone
- Simple and direct language
- Friendly but concise
- Avoid long explanations

WHEN UNSURE:
Respond: "I need to understand better. Contact: hello@singulai.site"

KNOWLEDGE BASE:
${getKnowledgeContext()}
`;
}

module.exports = {
  knowledgeBase,
  getKnowledgeContext,
  getAssertiveSystemPrompt
};
