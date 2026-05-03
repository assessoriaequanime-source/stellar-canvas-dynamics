const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

router.get('/contracts', async (req, res) => {
    try {
        const contracts = await blockchainService.getAllContractsInfo();
        res.json({
            success: true,
            network: 'sepolia',
            contracts
        });
    } catch (error) {
        console.error('Error getting contracts:', error);
        res.status(500).json({ error: 'Falha ao obter informações dos contratos' });
    }
});

router.get('/contracts/:contractName', async (req, res) => {
    try {
        const { contractName } = req.params;
        const contract = await blockchainService.getContractInfo(contractName);
        res.json({
            success: true,
            contract
        });
    } catch (error) {
        console.error('Error getting contract:', error);
        res.status(404).json({ error: 'Contrato não encontrado' });
    }
});

router.get('/avatars/total', async (req, res) => {
    try {
        const total = await blockchainService.getTotalAvatars();
        res.json({
            success: true,
            total,
            note: 'Total de avatares registrados no contrato AvatarBase'
        });
    } catch (error) {
        console.error('Error getting total avatars:', error);
        res.status(500).json({ error: 'Falha ao obter total de avatares' });
    }
});

router.get('/avatars/:avatarId', async (req, res) => {
    try {
        const { avatarId } = req.params;
        const parsedId = parseInt(avatarId);
        if (isNaN(parsedId)) {
            return res.status(400).json({ error: 'ID de avatar inválido' });
        }
        const avatar = await blockchainService.getAvatar(parsedId);
        
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar não encontrado na blockchain' });
        }

        res.json({
            success: true,
            avatar
        });
    } catch (error) {
        console.error('Error getting blockchain avatar:', error);
        res.status(500).json({ error: 'Falha ao obter avatar da blockchain' });
    }
});

router.get('/capsules/:capsuleId', async (req, res) => {
    try {
        const { capsuleId } = req.params;
        const parsedId = parseInt(capsuleId);
        if (isNaN(parsedId)) {
            return res.status(400).json({ error: 'ID de cápsula inválido' });
        }
        const capsule = await blockchainService.getCapsule(parsedId);
        
        if (!capsule) {
            return res.status(404).json({ error: 'Cápsula não encontrada na blockchain' });
        }

        res.json({
            success: true,
            capsule
        });
    } catch (error) {
        console.error('Error getting blockchain capsule:', error);
        res.status(500).json({ error: 'Falha ao obter cápsula da blockchain' });
    }
});

router.get('/legacies/:legacyId', async (req, res) => {
    try {
        const { legacyId } = req.params;
        const parsedId = parseInt(legacyId);
        if (isNaN(parsedId)) {
            return res.status(400).json({ error: 'ID de legado inválido' });
        }
        const legacy = await blockchainService.getLegacy(parsedId);
        
        if (!legacy) {
            return res.status(404).json({ error: 'Legado não encontrado na blockchain' });
        }

        res.json({
            success: true,
            legacy
        });
    } catch (error) {
        console.error('Error getting blockchain legacy:', error);
        res.status(500).json({ error: 'Falha ao obter legado da blockchain' });
    }
});

router.get('/wallet/:address/linked', async (req, res) => {
    try {
        const { address } = req.params;
        const isLinked = await blockchainService.isWalletLinked(address);
        const linkedAvatar = isLinked ? await blockchainService.getLinkedAvatar(address) : null;

        res.json({
            success: true,
            wallet: address,
            isLinked,
            linkedAvatarId: linkedAvatar
        });
    } catch (error) {
        console.error('Error checking wallet link:', error);
        res.status(500).json({ error: 'Falha ao verificar link da wallet' });
    }
});

router.get('/wallet/:address/balance', async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await blockchainService.getETHBalance(address);

        res.json({
            success: true,
            wallet: address,
            balance: balance,
            network: 'sepolia'
        });
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ error: 'Falha ao obter saldo da wallet' });
    }
});

router.post('/avatars/create', async (req, res) => {
    try {
        const { name, metadataHash } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nome do avatar é obrigatório' });
        }

        const metadata = metadataHash || require('crypto').createHash('sha256').update(name + Date.now()).digest('hex');
        const tx = await blockchainService.createAvatar(name, metadata);

        res.json({
            success: true,
            message: tx.verified ? 'Avatar criado na blockchain com sucesso' : 'Avatar criado (simulação)',
            transaction: tx
        });
    } catch (error) {
        console.error('Error creating blockchain avatar:', error);
        res.status(500).json({ error: error.message || 'Falha ao criar avatar na blockchain' });
    }
});

router.post('/wallet/link', async (req, res) => {
    try {
        const { avatarId } = req.body;
        
        if (!avatarId) {
            return res.status(400).json({ error: 'avatarId é obrigatório' });
        }

        const tx = await blockchainService.linkWallet(parseInt(avatarId));

        res.json({
            success: true,
            message: tx.verified ? 'Wallet vinculada ao avatar na blockchain' : 'Wallet vinculada (simulação)',
            transaction: tx
        });
    } catch (error) {
        console.error('Error linking wallet:', error);
        res.status(500).json({ error: error.message || 'Falha ao vincular wallet' });
    }
});

router.post('/capsules/create', async (req, res) => {
    try {
        const { avatarId, contentHash, unlockTime, recipient } = req.body;
        
        if (!avatarId || !contentHash || !unlockTime) {
            return res.status(400).json({ error: 'avatarId, contentHash e unlockTime são obrigatórios' });
        }

        const tx = await blockchainService.createCapsule(
            parseInt(avatarId),
            contentHash,
            parseInt(unlockTime),
            recipient || '0x0000000000000000000000000000000000000000'
        );

        res.json({
            success: true,
            message: tx.verified ? 'Cápsula criada na blockchain com sucesso' : 'Cápsula criada (simulação)',
            transaction: tx
        });
    } catch (error) {
        console.error('Error creating blockchain capsule:', error);
        res.status(500).json({ error: error.message || 'Falha ao criar cápsula na blockchain' });
    }
});

router.get('/status', async (req, res) => {
    try {
        const writeEnabled = blockchainService.isWriteEnabled();
        const totalAvatars = await blockchainService.getTotalAvatars();
        
        let systemWalletBalance = null;
        if (writeEnabled) {
            systemWalletBalance = await blockchainService.getSystemWalletBalance();
        }

        res.json({
            success: true,
            writeEnabled,
            network: 'sepolia',
            totalAvatars,
            systemWallet: writeEnabled ? blockchainService.wallet?.address : null,
            systemWalletBalance,
            contracts: Object.keys(blockchainService.contracts).map(name => ({
                name,
                address: blockchainService.contracts[name].target
            }))
        });
    } catch (error) {
        console.error('Error getting blockchain status:', error);
        res.status(500).json({ error: 'Falha ao obter status da blockchain' });
    }
});

router.get('/network-status', async (req, res) => {
    try {
        const blockNumber = await blockchainService.provider.getBlockNumber();
        const feeData = await blockchainService.provider.getFeeData();
        const gasPrice = feeData.gasPrice ? Number(feeData.gasPrice) / 1e9 : null;

        res.json({
            success: true,
            blockNumber,
            gasPrice: gasPrice ? gasPrice.toFixed(2) : '--',
            network: 'sepolia'
        });
    } catch (error) {
        console.error('Error getting network status:', error);
        res.status(500).json({ error: 'Falha ao obter status da rede' });
    }
});

router.get('/transactions/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const apiUrl = `https://eth-sepolia.blockscout.com/api/v2/addresses/${address}/transactions`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items && Array.isArray(data.items)) {
            const transactions = data.items.map(tx => ({
                hash: tx.hash,
                from: tx.from?.hash || '',
                to: tx.to?.hash || (tx.created_contract?.hash || ''),
                value: (Number(tx.value) / 1e18).toFixed(6),
                gasUsed: tx.gas_used,
                blockNumber: tx.block_number,
                timestamp: tx.timestamp,
                method: tx.method || (tx.raw_input === '0x' ? 'Transfer' : 'Contract Call'),
                isError: tx.result === 'error',
                confirmations: tx.confirmations,
                status: tx.result
            }));
            res.json({ success: true, address, transactions, total: transactions.length });
        } else {
            res.json({ success: true, address, transactions: [], total: 0, note: 'Nenhuma transação encontrada' });
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Falha ao obter transações' });
    }
});

module.exports = router;
