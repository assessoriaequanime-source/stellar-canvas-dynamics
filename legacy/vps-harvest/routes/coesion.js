const express = require('express');
const router = express.Router();
const coesionService = require('../services/coesionService');

router.post('/calculate', (req, res) => {
    try {
        const { particles, interactivity, absorption } = req.body;
        
        if (particles === undefined || interactivity === undefined) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios: particles, interactivity' 
            });
        }

        const omega = coesionService.calculateOmega(
            particles, 
            interactivity, 
            absorption || 0.5
        );

        res.json({
            success: true,
            omega,
            omegaPercent: (omega * 100).toFixed(2),
            status: coesionService.getStatus(omega),
            isSovereign: coesionService.isSovereign(omega),
            formula: 'Ω = 1 - e^(-k·A·(P·I))',
            inputs: {
                particles,
                interactivity,
                absorption: absorption || 0.5,
                k: 0.05
            }
        });
    } catch (error) {
        console.error('Error calculating coesion:', error);
        res.status(500).json({ error: 'Falha ao calcular coesão' });
    }
});

router.post('/from-scores', (req, res) => {
    try {
        const { authenticity, emotional_depth, clarity, uniqueness } = req.body;
        
        if (authenticity == null || emotional_depth == null || clarity == null || uniqueness == null) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios: authenticity, emotional_depth, clarity, uniqueness' 
            });
        }

        const result = coesionService.calculateFromScores({
            authenticity,
            emotional_depth,
            clarity,
            uniqueness
        });

        res.json({
            success: true,
            omega: result.omega,
            omegaPercent: (result.omega * 100).toFixed(2),
            status: coesionService.getStatus(result.omega),
            isSovereign: coesionService.isSovereign(result.omega),
            breakdown: result.breakdown,
            derivedValues: {
                particles: result.particles,
                interactivity: result.interactivity,
                absorption: result.absorption
            }
        });
    } catch (error) {
        console.error('Error calculating coesion from scores:', error);
        res.status(500).json({ error: 'Falha ao calcular coesão' });
    }
});

router.get('/thresholds', (req, res) => {
    res.json({
        success: true,
        thresholds: {
            SOVEREIGN: { min: 0.95, description: 'Avatar totalmente autêntico e coeso' },
            STABLE: { min: 0.80, description: 'Avatar estável com boa coesão' },
            DEVELOPING: { min: 0.60, description: 'Avatar em desenvolvimento' },
            EMERGING: { min: 0.40, description: 'Avatar emergente' },
            INITIALIZING: { min: 0.00, description: 'Avatar em inicialização' }
        },
        formula: {
            expression: 'Ω = 1 - e^(-k·A·(P·I))',
            variables: {
                k: 'Constante de taxa (0.05)',
                A: 'Absorption - profundidade emocional (0-1)',
                P: 'Particles - quantidade de dados coletados',
                I: 'Interactivity - qualidade das respostas (0-1)'
            }
        }
    });
});

module.exports = router;
