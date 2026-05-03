const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');
const walletService = require('../services/walletService');
const blockchainService = require('../services/blockchainService');
const emailService = require('../services/emailService');
const crypto = require('crypto');

const notifications = new Map();
const temporaryWallets = new Map();

const SGL_COST_PER_CAPSULE = 100;

router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sentCapsules = await storageService.getCapsulesBySender(userId);
        const user = await storageService.getUserById(userId);
        const receivedCapsules = user?.email ? await storageService.getCapsulesByRecipient(user.email) : [];
        
        const userCapsules = [
            ...sentCapsules.map(c => ({ ...c, type: 'sent' })),
            ...receivedCapsules.map(c => ({ ...c, type: 'received' }))
        ];
        
        res.json({
            success: true,
            capsules: userCapsules.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        });
    } catch (error) {
        console.error('Error getting user capsules:', error);
        res.status(500).json({ error: 'Falha ao obter cápsulas' });
    }
});

router.post('/create', async (req, res) => {
    try {
        const {
            senderId,
            senderWallet,
            recipientEmail,
            recipientName,
            recipientWhatsApp,
            title,
            message,
            deliveryType,
            deliveryDate,
            avatar,
            attachments
        } = req.body;

        if (!senderId || !senderWallet || !recipientEmail || !title || !message || !deliveryType) {
            return res.status(400).json({
                error: 'Campos obrigatórios: senderId, senderWallet, recipientEmail, title, message, deliveryType'
            });
        }

        const sglBalance = await walletService.getSGLBalanceOnChain(senderWallet);
        if (sglBalance < SGL_COST_PER_CAPSULE) {
            return res.status(400).json({
                error: `Saldo SGL insuficiente. Necessário: ${SGL_COST_PER_CAPSULE} SGL, Disponível: ${sglBalance} SGL`
            });
        }

        let txResult;
        try {
            txResult = await walletService.transferSGL(senderWallet, SGL_COST_PER_CAPSULE, 'capsule_creation');
            
            const newBalance = await walletService.getSGLBalanceOnChain(senderWallet);
            await storageService.updateUser(senderId, { sglBalance: Math.round(newBalance) });
            
            await storageService.saveTransaction({
                walletAddress: senderWallet,
                txHash: txResult.hash,
                blockNumber: txResult.blockNumber,
                from: senderWallet,
                to: '0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1',
                amount: SGL_COST_PER_CAPSULE,
                type: 'capsule_creation'
            });
        } catch (txError) {
            console.error('SGL transfer failed:', txError);
            return res.status(400).json({
                error: txError.message || 'Falha ao debitar SGL. Tente novamente.'
            });
        }

        const capsuleId = `cap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const contentHash = crypto.createHash('sha256').update(message + Date.now()).digest('hex');

        const existingUser = await storageService.getUserByEmail(recipientEmail);
        const sender = await storageService.getUserById(senderId);
        
        // Validate senderWallet matches sender's stored wallet
        if (sender?.walletAddress && sender.walletAddress.toLowerCase() !== senderWallet.toLowerCase()) {
            console.warn(`Wallet mismatch: provided ${senderWallet}, stored ${sender.walletAddress}`);
        }
        const validatedWallet = sender?.walletAddress || senderWallet;
        
        // Get sender's avatar ID - check storage first, then blockchain, then fallback to 1
        let senderAvatarId = sender?.avatarId;
        if (!senderAvatarId && validatedWallet) {
            try {
                const linkedAvatarId = await blockchainService.getLinkedAvatar(validatedWallet);
                if (linkedAvatarId > 0) {
                    senderAvatarId = linkedAvatarId;
                    console.log(`Found linked avatar on blockchain: ${senderAvatarId}`);
                }
            } catch (err) {
                console.log('Could not check linked avatar:', err.message);
            }
        }
        senderAvatarId = senderAvatarId || 1;

        const sglTxHash = txResult.hash;

        const unlockTime = deliveryType === 'scheduled' && deliveryDate 
            ? Math.floor(new Date(deliveryDate).getTime() / 1000) 
            : Math.floor(Date.now() / 1000);
        const recipientAddress = existingUser?.walletAddress || '0x0000000000000000000000000000000000000000';
        
        let blockchainTxHash = null;
        let blockchainStatus = 'pending';
        
        try {
            console.log(`Registering capsule on Sepolia blockchain (${deliveryType})...`);
            console.log(`Parameters: avatarId=${senderAvatarId}, contentHash=${contentHash.substring(0,16)}..., unlockTime=${unlockTime}, recipient=${recipientAddress}`);
            
            const blockchainResult = await blockchainService.createCapsule(
                senderAvatarId,
                contentHash,
                unlockTime,
                recipientAddress
            );
            
            if (blockchainResult?.hash) {
                blockchainTxHash = blockchainResult.hash;
                blockchainStatus = blockchainResult.status || 'confirmed';
                console.log(`Capsule registered on blockchain: ${blockchainTxHash} (status: ${blockchainStatus})`);
            }
        } catch (blockchainError) {
            console.error('Blockchain capsule registration failed:', blockchainError.message);
            blockchainStatus = 'failed';
        }

        const senderName = sender?.name || 'Someone special';
        
        const capsule = await storageService.createCapsule({
            id: capsuleId,
            senderId,
            senderWallet,
            senderName,
            recipientEmail,
            recipientName: recipientName || recipientEmail.split('@')[0],
            recipientWhatsApp: recipientWhatsApp || null,
            title,
            message,
            deliveryType,
            deliveryDate: deliveryType === 'scheduled' ? deliveryDate : null,
            status: deliveryType === 'immediate' ? 'delivered' : 'scheduled',
            sglCost: SGL_COST_PER_CAPSULE,
            txHash: blockchainTxHash
        });
        
        if (attachments && attachments.length > 0) {
            try {
                await storageService.saveCapsuleAttachments(capsuleId, attachments);
                console.log(`Saved ${attachments.length} attachment(s) for capsule ${capsuleId}`);
            } catch (attError) {
                console.error('Error saving attachments:', attError.message);
            }
        }

        // Create temporary wallet for recipient access (only once) and persist it
        let tempWallet = null;
        if (deliveryType === 'immediate' || !existingUser) {
            tempWallet = walletService.createTemporaryWallet(capsuleId);
            temporaryWallets.set(capsuleId, tempWallet);
            // Persist to storage for access after restart
            await storageService.saveTempWallet(capsuleId, tempWallet);
        }
        
        if (deliveryType === 'immediate' && tempWallet) {
            
            await emailService.sendCapsuleDelivery(
                recipientEmail,
                recipientName || recipientEmail.split('@')[0],
                senderName,
                title,
                tempWallet.accessCode,
                tempWallet.address
            );
            console.log(`Immediate capsule email sent to ${recipientEmail} with access code ${tempWallet.accessCode}`);
        }

        if (existingUser) {
            const notification = {
                id: `notif_${Date.now()}`,
                userId: existingUser.id,
                type: 'capsule_received',
                capsuleId,
                senderName,
                title: `Nova cápsula: ${title}`,
                read: false,
                createdAt: new Date().toISOString()
            };
            
            if (!notifications.has(existingUser.id)) {
                notifications.set(existingUser.id, []);
            }
            notifications.get(existingUser.id).push(notification);
        }

        console.log(`Capsule created successfully: ${capsuleId}, blockchain status: ${blockchainStatus}`);
        
        res.status(201).json({
            success: true,
            message: 'Cápsula criada com sucesso',
            capsule: {
                id: capsule.id,
                title: capsule.title,
                recipientEmail: capsule.recipientEmail,
                deliveryType: capsule.deliveryType,
                deliveryDate: capsule.deliveryDate,
                status: capsule.status,
                sglCost: capsule.sglCost,
                sglTxHash: sglTxHash,
                sglTxStatus: 'simulated',
                txHash: blockchainTxHash,
                blockchainStatus: blockchainStatus,
                temporaryWallet: tempWallet ? { accessCode: tempWallet.accessCode } : null
            }
        });
    } catch (error) {
        console.error('Error creating capsule:', error);
        res.status(500).json({ error: 'Falha ao criar cápsula' });
    }
});

router.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await storageService.getUserById(userId);
        
        const inMemoryNotifications = notifications.get(userId) || [];
        
        let receivedCapsules = [];
        if (user?.email) {
            receivedCapsules = await storageService.getCapsulesByRecipient(user.email);
        }
        
        const capsuleNotifications = receivedCapsules.map(cap => ({
            id: `notif_${cap.id}`,
            userId: userId,
            type: 'capsule_received',
            capsuleId: cap.id,
            senderName: cap.senderName || 'Someone special',
            title: cap.title || 'Time Capsule',
            message: cap.message?.substring(0, 100) + (cap.message?.length > 100 ? '...' : ''),
            read: cap.status === 'read',
            status: cap.status,
            createdAt: cap.createdAt
        }));
        
        const combined = [...inMemoryNotifications, ...capsuleNotifications]
            .reduce((acc, curr) => {
                if (!acc.find(n => n.capsuleId === curr.capsuleId)) {
                    acc.push(curr);
                }
                return acc;
            }, [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            success: true,
            notifications: combined,
            unreadCount: combined.filter(n => !n.read).length
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

router.post('/notifications/:notificationId/read', (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId } = req.body;
        
        const userNotifications = notifications.get(userId);
        if (userNotifications) {
            const notif = userNotifications.find(n => n.id === notificationId);
            if (notif) {
                notif.read = true;
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao marcar notificação' });
    }
});

router.post('/notifications/mark-all-read', (req, res) => {
    try {
        const { userId } = req.body;
        
        const userNotifications = notifications.get(userId);
        if (userNotifications) {
            userNotifications.forEach(n => n.read = true);
        }
        
        res.json({ success: true, message: 'Todas notificações marcadas como lidas' });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao marcar notificações' });
    }
});

router.get('/access/:accessCode', async (req, res) => {
    try {
        const { accessCode } = req.params;
        
        let foundCapsule = null;
        let foundWallet = null;
        
        for (const [capsuleId, tempWallet] of temporaryWallets) {
            if (tempWallet.accessCode === accessCode) {
                foundCapsule = await storageService.getCapsule(capsuleId);
                foundWallet = tempWallet;
                break;
            }
        }
        
        if (!foundCapsule) {
            const allCapsules = await storageService.getAllCapsules();
            for (const capsule of allCapsules) {
                const storedWallet = storageService.getTempWallet(capsule.id);
                if (storedWallet && storedWallet.accessCode === accessCode) {
                    foundCapsule = capsule;
                    foundWallet = storedWallet;
                    break;
                }
            }
        }

        if (foundCapsule) {
            const sender = await storageService.getUserById(foundCapsule.senderId);
            const senderName = sender?.name || 'Alguém especial';
            
            const attachments = await storageService.getCapsuleAttachments(foundCapsule.id);
            
            return res.json({
                success: true,
                capsule: {
                    id: foundCapsule.id,
                    title: foundCapsule.title,
                    message: foundCapsule.message,
                    senderName: senderName,
                    deliveryType: foundCapsule.deliveryType,
                    txHash: foundCapsule.txHash,
                    createdAt: foundCapsule.createdAt,
                    attachments: attachments.map(a => ({
                        id: a.id,
                        fileName: a.file_name,
                        fileType: a.file_type,
                        mimeType: a.mime_type,
                        fileData: a.file_data,
                        fileSize: a.file_size
                    }))
                },
                temporaryWallet: foundWallet ? { address: foundWallet.address } : null
            });
        }
        
        res.status(404).json({ error: 'Código de acesso inválido ou expirado' });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao acessar cápsula' });
    }
});

router.get('/:capsuleId', async (req, res) => {
    try {
        const { capsuleId } = req.params;
        const capsule = await storageService.getCapsule(capsuleId);
        
        if (!capsule) {
            return res.status(404).json({ error: 'Cápsula não encontrada' });
        }
        
        res.json({
            success: true,
            capsule
        });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao obter cápsula' });
    }
});

router.post('/:capsuleId/accept', async (req, res) => {
    try {
        const { capsuleId } = req.params;
        const { recipientWallet, action } = req.body;
        
        const capsule = await storageService.getCapsule(capsuleId);
        if (!capsule) {
            return res.status(404).json({ error: 'Cápsula não encontrada' });
        }
        
        if (action === 'reject') {
            await storageService.updateCapsuleStatus(capsuleId, 'rejected');
            if (temporaryWallets.has(capsuleId)) {
                temporaryWallets.delete(capsuleId);
            }
            
            return res.json({
                success: true,
                message: 'Cápsula rejeitada. Wallet temporária removida.',
                capsule: { id: capsule.id, status: 'rejected' }
            });
        }
        
        if (!recipientWallet) {
            return res.status(400).json({ error: 'Wallet de destino obrigatória para aceitar' });
        }
        
        await storageService.updateCapsuleStatus(capsuleId, 'accepted');
        
        if (temporaryWallets.has(capsuleId)) {
            temporaryWallets.delete(capsuleId);
        }
        
        res.json({
            success: true,
            message: 'Cápsula aceita com sucesso',
            capsule: {
                id: capsule.id,
                status: 'accepted',
                recipientWallet: recipientWallet
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao processar cápsula' });
    }
});

router.get('/stats/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sentCapsules = await storageService.getCapsulesBySender(userId);
        const user = await storageService.getUserById(userId);
        const receivedCapsules = user?.email ? await storageService.getCapsulesByRecipient(user.email) : [];
        
        const sent = sentCapsules.length;
        const pending = sentCapsules.filter(c => c.status === 'scheduled').length;
        const received = receivedCapsules.length;
        
        res.json({
            success: true,
            stats: { sent, received, pending }
        });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao obter estatísticas' });
    }
});

module.exports = router;
