/**
 * Blockchain Service - Read-only browser operations
 * Only reads from blockchain, no write operations
 */

import { ethers } from 'ethers';
import { CONTRACTS, SEPOLIA_RPC_URLS, SGL_TOKEN_ADDRESS, ERC20_ABI } from './contracts';
import type { BlockchainProvider, Avatar, TimeCapsule, DigitalLegacy } from './types';

class BlockchainReadService {
  private provider: ethers.JsonRpcProvider | null = null;
  private contracts: Record<string, ethers.Contract> = {};

  /**
   * Initialize the blockchain service with a provider
   */
  async initialize(): Promise<BlockchainProvider> {
    try {
      // Try each RPC URL until one works
      for (const rpcUrl of SEPOLIA_RPC_URLS) {
        try {
          this.provider = new ethers.JsonRpcProvider(rpcUrl);
          // Test connection
          await this.provider.getNetwork();
          console.log(`✓ Connected to ${rpcUrl}`);

          // Initialize all contract readers
          this.initializeContracts();

          return {
            isConnected: true,
            url: rpcUrl,
          };
        } catch (error) {
          console.warn(`Failed to connect to ${rpcUrl}:`, (error as Error).message);
          this.provider = null;
        }
      }

      throw new Error('Could not connect to any RPC endpoint');
    } catch (error) {
      console.error('Blockchain service initialization failed:', error);
      return {
        isConnected: false,
        url: '',
      };
    }
  }

  /**
   * Initialize all contract readers
   */
  private initializeContracts(): void {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    for (const [name, config] of Object.entries(CONTRACTS)) {
      try {
        this.contracts[name] = new ethers.Contract(config.address, config.abi, this.provider);
      } catch (error) {
        console.error(`Failed to initialize contract ${name}:`, error);
      }
    }
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.provider !== null;
  }

  /**
   * Get current network information
   */
  async getNetwork(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    const network = await this.provider.getNetwork();
    return `${network.name} (Chain ID: ${network.chainId})`;
  }

  /**
   * Get SGL token balance for an address
   */
  async getSGLBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const sglContract = new ethers.Contract(SGL_TOKEN_ADDRESS, ERC20_ABI, this.provider);
      const balance = await sglContract.balanceOf(address);
      const decimals = await sglContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to get SGL balance:', error);
      throw error;
    }
  }

  /**
   * Get ETH balance for an address
   */
  async getETHBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get ETH balance:', error);
      throw error;
    }
  }

  /**
   * Get total avatars created
   */
  async getTotalAvatars(): Promise<number> {
    if (!this.contracts['AvatarBase']) {
      throw new Error('AvatarBase contract not initialized');
    }

    try {
      const total = await this.contracts['AvatarBase'].totalAvatars();
      return Number(total);
    } catch (error) {
      console.error('Failed to get total avatars:', error);
      throw error;
    }
  }

  /**
   * Get avatar information
   */
  async getAvatar(avatarId: number): Promise<Avatar | null> {
    if (!this.contracts['AvatarBase']) {
      throw new Error('AvatarBase contract not initialized');
    }

    try {
      const avatar = await this.contracts['AvatarBase'].getAvatar(avatarId);
      return {
        id: avatarId,
        name: avatar.name,
        metadataHash: avatar.metadataHash,
        owner: avatar.owner,
        createdAt: Number(avatar.createdAt),
      };
    } catch (error) {
      console.error(`Failed to get avatar ${avatarId}:`, error);
      throw error;
    }
  }

  /**
   * Get avatar owner
   */
  async getAvatarOwner(avatarId: number): Promise<string> {
    if (!this.contracts['AvatarBase']) {
      throw new Error('AvatarBase contract not initialized');
    }

    try {
      return await this.contracts['AvatarBase'].avatarOwner(avatarId);
    } catch (error) {
      console.error(`Failed to get avatar owner for ${avatarId}:`, error);
      throw error;
    }
  }

  /**
   * Get time capsule information
   */
  async getCapsule(capsuleId: number): Promise<TimeCapsule | null> {
    if (!this.contracts['TimeCapsule']) {
      throw new Error('TimeCapsule contract not initialized');
    }

    try {
      const capsule = await this.contracts['TimeCapsule'].getCapsule(capsuleId);
      return {
        id: capsuleId,
        avatarId: Number(capsule.avatarId),
        contentHash: capsule.contentHash,
        unlockTime: Number(capsule.unlockTime),
        recipient: capsule.recipient,
        isOpened: capsule.isOpened,
      };
    } catch (error) {
      console.error(`Failed to get capsule ${capsuleId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a capsule can be opened
   */
  async canOpenCapsule(capsuleId: number): Promise<boolean> {
    if (!this.contracts['TimeCapsule']) {
      throw new Error('TimeCapsule contract not initialized');
    }

    try {
      return await this.contracts['TimeCapsule'].canOpen(capsuleId);
    } catch (error) {
      console.error(`Failed to check if capsule ${capsuleId} can be opened:`, error);
      throw error;
    }
  }

  /**
   * Get digital legacy information
   */
  async getLegacy(legacyId: number): Promise<DigitalLegacy | null> {
    if (!this.contracts['DigitalLegacy']) {
      throw new Error('DigitalLegacy contract not initialized');
    }

    try {
      const legacy = await this.contracts['DigitalLegacy'].getLegacy(legacyId);
      return {
        id: legacyId,
        avatarId: Number(legacy.avatarId),
        legacyHash: legacy.legacyHash,
        heirs: legacy.heirs,
        createdAt: Number(legacy.createdAt),
      };
    } catch (error) {
      console.error(`Failed to get legacy ${legacyId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an address is linked to an avatar
   */
  async isWalletLinked(walletAddress: string): Promise<boolean> {
    if (!this.contracts['AvatarWalletLink']) {
      throw new Error('AvatarWalletLink contract not initialized');
    }

    try {
      return await this.contracts['AvatarWalletLink'].isLinked(walletAddress);
    } catch (error) {
      console.error(`Failed to check if wallet ${walletAddress} is linked:`, error);
      throw error;
    }
  }

  /**
   * Get linked avatar for a wallet address
   */
  async getLinkedAvatar(walletAddress: string): Promise<number | null> {
    if (!this.contracts['AvatarWalletLink']) {
      throw new Error('AvatarWalletLink contract not initialized');
    }

    try {
      const avatarId = await this.contracts['AvatarWalletLink'].getLinkedAvatar(
        walletAddress,
      );
      return Number(avatarId) > 0 ? Number(avatarId) : null;
    } catch (error) {
      console.error(`Failed to get linked avatar for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Encode data for registry-like storage
   * Used for storing complex data in logs/events
   */
  encodeRegistryData(type: string, params: Record<string, unknown>): string {
    const payload = {
      type,
      ...params,
      ts: Date.now(),
    };
    return ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload)));
  }

  /**
   * Decode registry data
   */
  decodeRegistryData(hexData: string): Record<string, unknown> | null {
    try {
      const decoded = ethers.toUtf8String(hexData);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode registry data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainReadService();

// Export class for testing
export { BlockchainReadService };
