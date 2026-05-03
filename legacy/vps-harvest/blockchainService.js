const { ethers } = require('ethers');

const RPC_URLS = [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://rpc.sepolia.org'
];

const CONTRACTS = {
    AvatarBase: {
        address: '0x95F531cafca627A447C0F1119B8b6aCC730163E5',
        abi: [
            'function createAvatar(string memory _name, string memory _metadataHash) public returns (uint256)',
            'function getAvatar(uint256 _avatarId) public view returns (string memory name, string memory metadataHash, address owner, uint256 createdAt)',
            'function totalAvatars() public view returns (uint256)',
            'function avatarOwner(uint256 _avatarId) public view returns (address)',
            'event AvatarCreated(uint256 indexed avatarId, address indexed owner, string name)'
        ]
    },
    TimeCapsule: {
        address: '0x6A58aD664071d450cF7e794Dac5A13e3a1DeD172',
        abi: [
            'function createCapsule(uint256 _avatarId, string memory _contentHash, uint256 _unlockTime, address _recipient) public returns (uint256)',
            'function getCapsule(uint256 _capsuleId) public view returns (uint256 avatarId, string memory contentHash, uint256 unlockTime, address recipient, bool isOpened)',
            'function openCapsule(uint256 _capsuleId) public',
            'function canOpen(uint256 _capsuleId) public view returns (bool)',
            'event CapsuleCreated(uint256 indexed capsuleId, uint256 indexed avatarId, uint256 unlockTime)'
        ]
    },
    DigitalLegacy: {
        address: '0x0Ee8f5dC7E9BC9AF344eB987B8363b33E737b757',
        abi: [
            'function createLegacy(uint256 _avatarId, string memory _legacyHash, address[] memory _heirs) public returns (uint256)',
            'function getLegacy(uint256 _legacyId) public view returns (uint256 avatarId, string memory legacyHash, address[] memory heirs, uint256 createdAt)',
            'function addHeir(uint256 _legacyId, address _heir) public',
            'function removeHeir(uint256 _legacyId, address _heir) public',
            'event LegacyCreated(uint256 indexed legacyId, uint256 indexed avatarId)'
        ]
    },
    AvatarWalletLink: {
        address: '0x9F475e5D174577f2FB17a9D94a8093e2D8c9ED41',
        abi: [
            'function linkWallet(uint256 _avatarId) public',
            'function unlinkWallet(uint256 _avatarId) public',
            'function getLinkedAvatar(address _wallet) public view returns (uint256)',
            'function isLinked(address _wallet) public view returns (bool)',
            'event WalletLinked(address indexed wallet, uint256 indexed avatarId)'
        ]
    }
};

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URLS[0]);
        this.wallet = null;
        this.contracts = {};
        this.signedContracts = {};
        
        for (const [name, config] of Object.entries(CONTRACTS)) {
            this.contracts[name] = new ethers.Contract(
                config.address,
                config.abi,
                this.provider
            );
        }
    }

    initialize() {
        const privateKey = process.env.SGL_DISTRIBUTOR_PRIVATE_KEY;
        if (privateKey) {
            try {
                this.wallet = new ethers.Wallet(privateKey, this.provider);
                
                for (const [name, config] of Object.entries(CONTRACTS)) {
                    this.signedContracts[name] = new ethers.Contract(
                        config.address,
                        config.abi,
                        this.wallet
                    );
                }
                
                console.log('Blockchain service initialized with wallet:', this.wallet.address);
                return true;
            } catch (error) {
                console.error('Failed to initialize blockchain wallet:', error.message);
                return false;
            }
        } else {
            console.warn('Blockchain service: No private key configured - using read-only mode');
            return false;
        }
    }

    isWriteEnabled() {
        return this.wallet !== null;
    }

    encodeRegistryData(type, params) {
        const payload = JSON.stringify({ type, ...params, ts: Date.now() });
        return ethers.hexlify(ethers.toUtf8Bytes(payload));
    }

    async registerOnChain(type, params, retries = 2) {
        if (!this.wallet) {
            console.log(`Blockchain write not enabled - simulating ${type}`);
            return this.generateMockTransaction(type, params);
        }

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const data = this.encodeRegistryData(type, params);
                const nonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');

                console.log(`Registering ${type} on Sepolia (nonce: ${nonce}, attempt: ${attempt + 1})...`);

                const tx = await this.wallet.sendTransaction({
                    to: this.wallet.address,
                    value: 0,
                    data: data,
                    nonce: nonce
                });

                console.log(`${type} transaction sent: ${tx.hash}`);

                const receipt = await tx.wait();
                console.log(`${type} confirmed in block ${receipt.blockNumber}`);

                return {
                    hash: tx.hash,
                    action: type,
                    data: params,
                    network: 'sepolia',
                    blockNumber: receipt.blockNumber,
                    timestamp: Date.now(),
                    explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
                    status: 'confirmed',
                    verified: true
                };
            } catch (error) {
                console.error(`${type} on-chain registration error (attempt ${attempt + 1}):`, error.message);
                if (attempt < retries && (error.message.includes('nonce') || error.message.includes('replacement'))) {
                    console.log(`Retrying ${type} registration after nonce conflict...`);
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                    continue;
                }
                throw new Error(`Failed to register ${type} on blockchain: ${error.message}`);
            }
        }
    }

    async getContractInfo(contractName) {
        const config = CONTRACTS[contractName];
        if (!config) {
            throw new Error(`Contract ${contractName} not found`);
        }

        return {
            name: contractName,
            address: config.address,
            network: 'sepolia',
            explorerUrl: `https://sepolia.etherscan.io/address/${config.address}`
        };
    }

    async getAllContractsInfo() {
        const info = {};
        for (const name of Object.keys(CONTRACTS)) {
            info[name] = await this.getContractInfo(name);
        }
        return info;
    }

    async getTotalAvatars() {
        try {
            const total = await this.contracts.AvatarBase.totalAvatars();
            return Number(total);
        } catch (error) {
            console.log('getTotalAvatars error:', error.message);
            return 0;
        }
    }

    async getAvatar(avatarId) {
        try {
            const result = await this.contracts.AvatarBase.getAvatar(avatarId);
            return {
                id: avatarId,
                name: result[0],
                metadataHash: result[1],
                owner: result[2],
                createdAt: Number(result[3])
            };
        } catch (error) {
            console.log('getAvatar error:', error.message);
            return null;
        }
    }

    async getCapsule(capsuleId) {
        try {
            const result = await this.contracts.TimeCapsule.getCapsule(capsuleId);
            return {
                id: capsuleId,
                avatarId: Number(result[0]),
                contentHash: result[1],
                unlockTime: Number(result[2]),
                recipient: result[3],
                isOpened: result[4]
            };
        } catch (error) {
            console.log('getCapsule error:', error.message);
            return null;
        }
    }

    async getLegacy(legacyId) {
        try {
            const result = await this.contracts.DigitalLegacy.getLegacy(legacyId);
            return {
                id: legacyId,
                avatarId: Number(result[0]),
                legacyHash: result[1],
                heirs: result[2],
                createdAt: Number(result[3])
            };
        } catch (error) {
            console.log('getLegacy error:', error.message);
            return null;
        }
    }

    async isWalletLinked(walletAddress) {
        try {
            return await this.contracts.AvatarWalletLink.isLinked(walletAddress);
        } catch (error) {
            console.log('isWalletLinked error:', error.message);
            return false;
        }
    }

    async getLinkedAvatar(walletAddress) {
        try {
            const avatarId = await this.contracts.AvatarWalletLink.getLinkedAvatar(walletAddress);
            return Number(avatarId);
        } catch (error) {
            console.log('getLinkedAvatar error:', error.message);
            return 0;
        }
    }

    async getETHBalance(walletAddress) {
        try {
            const balance = await this.provider.getBalance(walletAddress);
            return ethers.formatEther(balance);
        } catch (error) {
            console.log('getETHBalance error:', error.message);
            return '0';
        }
    }

    async getSystemWalletBalance() {
        if (!this.wallet) return null;
        return await this.getETHBalance(this.wallet.address);
    }

    async linkWallet(avatarId) {
        return this.registerOnChain('linkWallet', {
            contract: CONTRACTS.AvatarWalletLink.address,
            avatarId
        });
    }

    async createAvatar(name, metadataHash) {
        return this.registerOnChain('createAvatar', {
            contract: CONTRACTS.AvatarBase.address,
            name,
            metadataHash
        });
    }

    async createCapsule(avatarId, contentHash, unlockTime, recipient) {
        return this.registerOnChain('createCapsule', {
            contract: CONTRACTS.TimeCapsule.address,
            avatarId,
            contentHash,
            unlockTime,
            recipient
        });
    }

    async createLegacy(avatarId, legacyHash, heirs) {
        return this.registerOnChain('createLegacy', {
            contract: CONTRACTS.DigitalLegacy.address,
            avatarId,
            legacyHash,
            heirs
        });
    }

    generateMockTransaction(action, data) {
        const txHash = '0x' + Array(64).fill(0).map(() => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');

        return {
            hash: txHash,
            action: action,
            data: data,
            network: 'sepolia',
            timestamp: Date.now(),
            explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
            status: 'simulated',
            note: 'Transação simulada - configure SGL_DISTRIBUTOR_PRIVATE_KEY para transações reais'
        };
    }

    async simulateCreateAvatar(name, metadataHash) {
        return this.generateMockTransaction('createAvatar', {
            contract: CONTRACTS.AvatarBase.address,
            method: 'createAvatar',
            params: { name, metadataHash }
        });
    }

    async simulateCreateCapsule(avatarId, contentHash, unlockTime, recipient) {
        return this.generateMockTransaction('createCapsule', {
            contract: CONTRACTS.TimeCapsule.address,
            method: 'createCapsule',
            params: { avatarId, contentHash, unlockTime, recipient }
        });
    }

    async simulateCreateLegacy(avatarId, legacyHash, heirs) {
        return this.generateMockTransaction('createLegacy', {
            contract: CONTRACTS.DigitalLegacy.address,
            method: 'createLegacy',
            params: { avatarId, legacyHash, heirs }
        });
    }
}

module.exports = new BlockchainService();
