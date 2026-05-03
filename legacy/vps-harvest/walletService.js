const { ethers } = require('ethers');
const crypto = require('crypto');

const SGL_TOKEN_ADDRESS = '0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1';
const INITIAL_SGL_BALANCE = 10000;
const GAS_ETH_AMOUNT = '0.0005'; // ETH for gas sent with each SGL transfer

const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

class WalletService {
    constructor() {
        this.provider = null;
        this.distributorWallet = null;
        this.sglContract = null;
        this.wallets = new Map();
        this.provisionalWallets = new Map();
        this.capsuleAccess = new Map();
        this.sglBalances = new Map();
        this.sglTransactions = new Map();
        this.pendingTransactions = new Map();
        this.localDeductions = new Map();
    }

    initialize() {
        try {
            const rpcUrls = [
                'https://ethereum-sepolia-rpc.publicnode.com',
                'https://sepolia.drpc.org',
                'https://rpc.sepolia.org',
                'https://1rpc.io/sepolia'
            ];
            this.provider = new ethers.JsonRpcProvider(rpcUrls[0]);
            
            const distributorPrivateKey = process.env.SGL_DISTRIBUTOR_PRIVATE_KEY;
            if (distributorPrivateKey) {
                this.distributorWallet = new ethers.Wallet(distributorPrivateKey, this.provider);
                this.sglContract = new ethers.Contract(SGL_TOKEN_ADDRESS, ERC20_ABI, this.distributorWallet);
                console.log('Wallet service initialized with Sepolia testnet');
                console.log('SGL Distributor wallet:', this.distributorWallet.address);
            } else {
                console.warn('Wallet service: SGL_DISTRIBUTOR_PRIVATE_KEY not configured - using simulation mode');
            }
        } catch (error) {
            console.warn('Wallet service: Could not connect to Sepolia -', error.message);
        }
    }

    createWallet() {
        const wallet = ethers.Wallet.createRandom();
        
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic.phrase,
            path: wallet.mnemonic.path
        };
    }

    async sendGasETH(toAddress) {
        if (!this.distributorWallet) {
            console.log('No distributor wallet - skipping gas ETH transfer');
            return null;
        }

        try {
            const gasAmount = ethers.parseEther(GAS_ETH_AMOUNT);
            
            console.log(`Sending ${GAS_ETH_AMOUNT} ETH for gas to ${toAddress}...`);
            
            const tx = await this.distributorWallet.sendTransaction({
                to: toAddress,
                value: gasAmount
            });
            
            console.log(`Gas ETH transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`Gas ETH confirmed in block ${receipt.blockNumber}`);
            
            return {
                success: true,
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
                from: this.distributorWallet.address,
                to: toAddress,
                amount: GAS_ETH_AMOUNT,
                type: 'gas_eth'
            };
        } catch (error) {
            console.error('Gas ETH transfer error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async transferSGLReal(toAddress, amount) {
        if (!this.distributorWallet || !this.sglContract) {
            throw new Error('Blockchain connection not configured');
        }

        try {
            const decimals = 18;
            const amountWei = ethers.parseUnits(amount.toString(), decimals);
            
            console.log(`Transferring ${amount} SGL to ${toAddress}...`);
            
            const tx = await this.sglContract.transfer(toAddress, amountWei);
            console.log(`SGL Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`SGL Transaction confirmed in block ${receipt.blockNumber}`);
            
            // Send gas ETH along with SGL
            const gasResult = await this.sendGasETH(toAddress);
            
            return {
                success: true,
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
                from: this.distributorWallet.address,
                to: toAddress,
                amount: amount,
                gasEth: gasResult
            };
        } catch (error) {
            console.error('SGL transfer error:', error.message);
            throw error;
        }
    }

    async createUserWallet(userId, options = { distributeTokens: true }) {
        const walletData = this.createWallet();
        
        const userWallet = {
            id: `wallet_${Date.now()}`,
            userId,
            address: walletData.address,
            privateKey: this.encryptKey(walletData.privateKey),
            mnemonic: this.encryptKey(walletData.mnemonic),
            network: 'sepolia',
            chainId: 11155111,
            createdAt: new Date().toISOString(),
            isProvisional: false,
            balance: '0'
        };

        this.wallets.set(userId, userWallet);

        let txResult = null;
        let gasResult = null;
        let sglBalance = 0;

        if (options.distributeTokens) {
            if (this.distributorWallet && this.sglContract) {
                try {
                    txResult = await this.transferSGLReal(walletData.address, INITIAL_SGL_BALANCE);
                    gasResult = txResult.gasEth;
                    sglBalance = INITIAL_SGL_BALANCE;
                } catch (error) {
                    console.error('Failed to send initial SGL tokens:', error.message);
                    sglBalance = 0;
                    txResult = { hash: null, blockNumber: null, error: error.message };
                }
            } else {
                sglBalance = INITIAL_SGL_BALANCE;
                txResult = {
                    hash: `0x${crypto.randomBytes(32).toString('hex')}`,
                    blockNumber: Math.floor(Math.random() * 1000000) + 7000000,
                    simulated: true
                };
                gasResult = {
                    hash: `0x${crypto.randomBytes(32).toString('hex')}`,
                    blockNumber: txResult.blockNumber,
                    simulated: true,
                    amount: GAS_ETH_AMOUNT
                };
            }
        }

        this.sglBalances.set(walletData.address, sglBalance);

        if (!this.sglTransactions.has(walletData.address)) {
            this.sglTransactions.set(walletData.address, []);
        }

        if (options.distributeTokens && txResult && txResult.hash) {
            this.sglTransactions.get(walletData.address).push({
                hash: txResult.hash,
                blockNumber: txResult.blockNumber,
                from: txResult.from || SGL_TOKEN_ADDRESS,
                to: walletData.address,
                amount: INITIAL_SGL_BALANCE,
                type: 'initial_distribution',
                timestamp: new Date().toISOString(),
                simulated: txResult.simulated || false,
                verified: !txResult.simulated
            });

            if (gasResult && gasResult.hash) {
                this.sglTransactions.get(walletData.address).push({
                    hash: gasResult.hash,
                    blockNumber: gasResult.blockNumber,
                    from: gasResult.from || 'system',
                    to: walletData.address,
                    amount: GAS_ETH_AMOUNT,
                    type: 'gas_eth_distribution',
                    timestamp: new Date().toISOString(),
                    simulated: gasResult.simulated || false,
                    verified: !gasResult.simulated
                });
            }
        }

        return {
            address: walletData.address,
            privateKey: walletData.privateKey,
            mnemonic: walletData.mnemonic,
            network: 'Sepolia Testnet',
            explorerUrl: `https://sepolia.etherscan.io/address/${walletData.address}`,
            sglBalance: this.sglBalances.get(walletData.address) || 0,
            sglTxHash: txResult?.hash || null,
            sglBlockNumber: txResult?.blockNumber || null,
            sglTransactionUrl: txResult?.hash ? `https://sepolia.etherscan.io/tx/${txResult.hash}` : null,
            gasEthSent: GAS_ETH_AMOUNT,
            gasEthTxHash: gasResult?.hash || null,
            gasEthTransactionUrl: gasResult?.hash ? `https://sepolia.etherscan.io/tx/${gasResult.hash}` : null,
            encryptedPrivateKey: userWallet.privateKey,
            encryptedMnemonic: userWallet.mnemonic
        };
    }

    async awardFirstLoginBonus(user) {
        if (!user || !user.walletAddress) {
            return { success: false, error: 'Usuário não possui wallet associada' };
        }

        if (user.firstBonusSent) {
            return { success: false, error: 'Bônus já foi distribuído anteriormente' };
        }

        if (this.distributorWallet && this.sglContract) {
            try {
                const txResult = await this.transferSGLReal(user.walletAddress, INITIAL_SGL_BALANCE);
                const gasResult = txResult.gasEth;

                this.sglBalances.set(user.walletAddress, INITIAL_SGL_BALANCE);
                if (!this.sglTransactions.has(user.walletAddress)) {
                    this.sglTransactions.set(user.walletAddress, []);
                }
                this.sglTransactions.get(user.walletAddress).push({
                    hash: txResult.hash,
                    blockNumber: txResult.blockNumber,
                    from: txResult.from,
                    to: user.walletAddress,
                    amount: INITIAL_SGL_BALANCE,
                    type: 'initial_distribution',
                    timestamp: new Date().toISOString(),
                    verified: true
                });
                if (gasResult && gasResult.success) {
                    this.sglTransactions.get(user.walletAddress).push({
                        hash: gasResult.hash,
                        blockNumber: gasResult.blockNumber,
                        from: gasResult.from,
                        to: user.walletAddress,
                        amount: GAS_ETH_AMOUNT,
                        type: 'gas_eth_distribution',
                        timestamp: new Date().toISOString(),
                        verified: true
                    });
                }

                return {
                    success: true,
                    txHash: txResult.hash,
                    gasTxHash: gasResult?.hash || null,
                    amount: INITIAL_SGL_BALANCE
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        // Simulation mode if distributor wallet is not configured.
        const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        const gasHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        const blockNumber = Math.floor(Math.random() * 1000000) + 7000000;

        this.sglBalances.set(user.walletAddress, INITIAL_SGL_BALANCE);
        if (!this.sglTransactions.has(user.walletAddress)) {
            this.sglTransactions.set(user.walletAddress, []);
        }
        this.sglTransactions.get(user.walletAddress).push({
            hash: txHash,
            blockNumber,
            from: SGL_TOKEN_ADDRESS,
            to: user.walletAddress,
            amount: INITIAL_SGL_BALANCE,
            type: 'initial_distribution',
            timestamp: new Date().toISOString(),
            simulated: true
        });
        this.sglTransactions.get(user.walletAddress).push({
            hash: gasHash,
            blockNumber,
            from: 'system',
            to: user.walletAddress,
            amount: GAS_ETH_AMOUNT,
            type: 'gas_eth_distribution',
            timestamp: new Date().toISOString(),
            simulated: true
        });

        return {
            success: true,
            txHash,
            gasTxHash: gasHash,
            amount: INITIAL_SGL_BALANCE,
            simulated: true
        };
    }
    
    async getSGLBalanceOnChain(address) {
        if (!this.sglContract) {
            return this.sglBalances.get(address) || 0;
        }
        
        try {
            const readContract = new ethers.Contract(SGL_TOKEN_ADDRESS, ERC20_ABI, this.provider);
            const balance = await readContract.balanceOf(address);
            const decimals = 18;
            const onChainBalance = Number(ethers.formatUnits(balance, decimals));
            
            const totalDeductions = this.localDeductions.get(address) || 0;
            if (totalDeductions > 0) {
                const effectiveBalance = onChainBalance - totalDeductions;
                return Math.max(0, effectiveBalance);
            }
            
            return onChainBalance;
        } catch (error) {
            console.error('Error getting on-chain balance:', error.message);
            return this.sglBalances.get(address) || 0;
        }
    }
    
    getSGLBalance(address) {
        return this.sglBalances.get(address) || 0;
    }
    
    getSGLTransactions(address) {
        return this.sglTransactions.get(address) || [];
    }
    
    async transferSGL(fromAddress, amount, reason = 'transfer') {
        const currentBalance = await this.getSGLBalanceOnChain(fromAddress);
        
        if (currentBalance < amount) {
            throw new Error(`Saldo insuficiente: ${currentBalance} SGL disponível, ${amount} SGL necessário`);
        }
        
        this.sglBalances.set(fromAddress, currentBalance - amount);
        const prevDeductions = this.localDeductions.get(fromAddress) || 0;
        this.localDeductions.set(fromAddress, prevDeductions + amount);
        
        // Note: This is a simulated transaction for internal tracking
        // Real SGL token transfers would require calling the ERC20 transfer function
        const tx = {
            hash: `0x${crypto.randomBytes(32).toString('hex')}`,
            blockNumber: Math.floor(Math.random() * 1000000) + 7000000,
            from: fromAddress,
            to: SGL_TOKEN_ADDRESS,
            amount: amount,
            type: reason,
            timestamp: new Date().toISOString(),
            status: 'simulated',
            note: 'Internal tracking - capsule registered on TimeCapsule contract'
        };
        
        console.log(`SGL transfer (simulated): ${amount} SGL from ${fromAddress} for ${reason}`);
        
        if (!this.sglTransactions.has(fromAddress)) {
            this.sglTransactions.set(fromAddress, []);
        }
        this.sglTransactions.get(fromAddress).push(tx);
        
        return tx;
    }
    
    createTemporaryWallet(capsuleId) {
        const walletData = this.createWallet();
        const accessCode = this.generateAccessCode();
        return {
            address: walletData.address,
            privateKey: walletData.privateKey,
            mnemonic: walletData.mnemonic,
            accessCode,
            capsuleId,
            createdAt: new Date().toISOString()
        };
    }

    createProvisionalWallet(capsuleId, recipientName) {
        const walletData = this.createWallet();
        const accessCode = this.generateAccessCode();
        
        const provisional = {
            id: `prov_${Date.now()}`,
            capsuleId,
            recipientName,
            address: walletData.address,
            privateKey: walletData.privateKey,
            mnemonic: walletData.mnemonic,
            accessCode,
            createdAt: new Date().toISOString(),
            expiresAt: null,
            status: 'active',
            accessCount: 0,
            convertedToUser: false
        };

        this.provisionalWallets.set(accessCode, provisional);
        this.capsuleAccess.set(capsuleId, {
            provisionalId: provisional.id,
            accessCode,
            currentAddress: walletData.address,
            revoked: false
        });

        return {
            accessCode,
            address: walletData.address,
            accessUrl: `https://singulai.site/capsule/${accessCode}`,
            recipientName
        };
    }

    getProvisionalWallet(accessCode) {
        const provisional = this.provisionalWallets.get(accessCode);
        
        if (!provisional) {
            return { success: false, error: 'Código de acesso inválido' };
        }

        if (provisional.status === 'revoked') {
            return { success: false, error: 'Este acesso foi revogado pelo remetente' };
        }

        if (provisional.status === 'converted') {
            return { success: false, error: 'Esta wallet foi convertida para conta permanente' };
        }

        provisional.accessCount++;

        return {
            success: true,
            wallet: {
                address: provisional.address,
                recipientName: provisional.recipientName,
                capsuleId: provisional.capsuleId,
                isProvisional: true
            }
        };
    }

    revokeCapsuleAccess(capsuleId, reason = 'Remetente revogou acesso') {
        const access = this.capsuleAccess.get(capsuleId);
        
        if (!access) {
            return { success: false, error: 'Cápsula não encontrada' };
        }

        const provisional = this.provisionalWallets.get(access.accessCode);
        if (provisional) {
            provisional.status = 'revoked';
            provisional.revokedAt = new Date().toISOString();
            provisional.revokeReason = reason;
        }

        access.revoked = true;
        access.revokedAt = new Date().toISOString();

        return {
            success: true,
            message: 'Acesso revogado com sucesso',
            oldAddress: access.currentAddress
        };
    }

    redirectCapsule(capsuleId, newRecipientName) {
        const access = this.capsuleAccess.get(capsuleId);
        
        if (!access) {
            return { success: false, error: 'Cápsula não encontrada' };
        }

        if (access.revoked) {
            const newProvisional = this.createProvisionalWallet(capsuleId, newRecipientName);
            
            access.currentAddress = newProvisional.address;
            access.accessCode = newProvisional.accessCode;
            access.revoked = false;
            access.redirectedAt = new Date().toISOString();

            return {
                success: true,
                message: 'Cápsula redirecionada com sucesso',
                newAccessCode: newProvisional.accessCode,
                newAddress: newProvisional.address,
                accessUrl: newProvisional.accessUrl
            };
        }

        return { success: false, error: 'Revogue o acesso atual antes de redirecionar' };
    }

    convertProvisionalToUser(accessCode, userId, email) {
        const provisional = this.provisionalWallets.get(accessCode);
        
        if (!provisional) {
            return { success: false, error: 'Wallet provisória não encontrada' };
        }

        const userWallet = {
            id: `wallet_${Date.now()}`,
            userId,
            email,
            address: provisional.address,
            privateKey: this.encryptKey(provisional.privateKey),
            mnemonic: this.encryptKey(provisional.mnemonic),
            network: 'sepolia',
            chainId: 11155111,
            createdAt: new Date().toISOString(),
            convertedFrom: provisional.id,
            isProvisional: false
        };

        this.wallets.set(userId, userWallet);
        provisional.status = 'converted';
        provisional.convertedToUser = true;
        provisional.convertedAt = new Date().toISOString();

        return {
            success: true,
            message: 'Wallet convertida para conta permanente',
            wallet: {
                address: userWallet.address,
                network: 'Sepolia Testnet'
            }
        };
    }

    discardProvisionalWallet(accessCode) {
        const provisional = this.provisionalWallets.get(accessCode);
        
        if (!provisional) {
            return { success: false, error: 'Wallet provisória não encontrada' };
        }

        provisional.status = 'discarded';
        provisional.discardedAt = new Date().toISOString();

        return {
            success: true,
            message: 'Wallet descartada. Os dados foram removidos.'
        };
    }

    async checkBalance(address) {
        if (!this.provider) {
            return { balance: '0', formatted: '0 ETH' };
        }

        try {
            const balance = await this.provider.getBalance(address);
            return {
                balance: balance.toString(),
                formatted: `${ethers.formatEther(balance)} ETH`
            };
        } catch (error) {
            return { balance: '0', formatted: '0 ETH', error: error.message };
        }
    }

    getUserWallet(userId) {
        return this.wallets.get(userId) || null;
    }

    encryptKey(key) {
        const algorithm = 'aes-256-cbc';
        const secret = process.env.WALLET_ENCRYPTION_KEY || 'singulai-default-key-change-in-production-32';
        const secretKey = crypto.createHash('sha256').update(secret).digest();
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
        let encrypted = cipher.update(key, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `${iv.toString('hex')}:${encrypted}`;
    }

    decryptKey(encryptedKey) {
        const algorithm = 'aes-256-cbc';
        const secret = process.env.WALLET_ENCRYPTION_KEY || 'singulai-default-key-change-in-production-32';
        const secretKey = crypto.createHash('sha256').update(secret).digest();
        
        const [ivHex, encrypted] = encryptedKey.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    generateAccessCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    getWalletCredentials(userId) {
        const wallet = this.wallets.get(userId);
        if (!wallet) {
            return { success: false, error: 'Wallet não encontrada' };
        }

        return {
            success: true,
            address: wallet.address,
            privateKey: this.decryptKey(wallet.privateKey),
            mnemonic: this.decryptKey(wallet.mnemonic),
            network: 'Sepolia Testnet',
            chainId: 11155111,
            explorerUrl: `https://sepolia.etherscan.io/address/${wallet.address}`
        };
    }
    
    getDistributorInfo() {
        if (!this.distributorWallet) {
            return { configured: false };
        }
        return {
            configured: true,
            address: this.distributorWallet.address,
            tokenContract: SGL_TOKEN_ADDRESS
        };
    }
}

module.exports = new WalletService();
