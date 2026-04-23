class CoesionService {
    calculateOmega(particles, interactivity, absorption = 0.5) {
        const k = 0.05;
        const A = Math.max(0, Math.min(1, absorption));
        const P = Math.max(0, particles);
        const I = Math.max(0, Math.min(1, interactivity));
        
        const omega = 1 - Math.exp(-k * A * (P * I));
        
        return Math.min(Math.max(omega, 0), 1);
    }

    calculateFromScores(scores) {
        const { authenticity, emotional_depth, clarity, uniqueness } = scores;
        
        const avgScore = (authenticity + emotional_depth + clarity + uniqueness) / 4;
        const interactivity = avgScore / 100;
        
        const particles = Math.floor(avgScore * 10);
        
        const absorption = (emotional_depth + uniqueness) / 200;
        
        return {
            omega: this.calculateOmega(particles, interactivity, absorption),
            particles,
            interactivity,
            absorption,
            breakdown: {
                authenticity,
                emotional_depth,
                clarity,
                uniqueness,
                average: avgScore
            }
        };
    }

    calculateFromConversation(messages, latestScores) {
        const messageCount = messages.length;
        const userMessages = messages.filter(m => m.role === 'user').length;
        
        const baseParticles = userMessages * 20;
        
        const avgInteractivity = latestScores 
            ? (latestScores.authenticity + latestScores.emotional_depth) / 200
            : 0.3;
        
        const absorption = Math.min(1, messageCount * 0.1);
        
        const omega = this.calculateOmega(baseParticles, avgInteractivity, absorption);
        
        return {
            omega,
            particles: baseParticles,
            interactivity: avgInteractivity,
            absorption,
            messageCount,
            status: this.getStatus(omega)
        };
    }

    getStatus(omega) {
        if (omega >= 0.95) return 'SOVEREIGN';
        if (omega >= 0.80) return 'STABLE';
        if (omega >= 0.60) return 'DEVELOPING';
        if (omega >= 0.40) return 'EMERGING';
        return 'INITIALIZING';
    }

    isSovereign(omega) {
        return omega >= 0.95;
    }
}

module.exports = new CoesionService();
