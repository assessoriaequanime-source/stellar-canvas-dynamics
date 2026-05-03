/**
 * Blockchain Utilities Tests
 * Unit tests for wallet and blockchain modules
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateRandomWallet,
  isValidAddress,
  isValidPrivateKey,
  getChecksumAddress,
  formatAddressShort,
  blockchainService,
} from '../blockchain';

describe('Wallet Utilities', () => {
  describe('generateRandomWallet', () => {
    it('should generate a valid wallet', () => {
      const wallet = generateRandomWallet();
      expect(wallet.address).toBeDefined();
      expect(wallet.privateKey).toBeDefined();
      expect(wallet.mnemonic).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate different wallets on each call', () => {
      const wallet1 = generateRandomWallet();
      const wallet2 = generateRandomWallet();
      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct addresses', () => {
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0000000000000000000000000000000000000000',
        // Checksummed address
        '0x5aAeb6053ba3EEdb6A475A1c033f2E4B130d5d22',
      ];

      validAddresses.forEach((addr) => {
        expect(isValidAddress(addr)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '0x123', // Too short
        '0xGGGG567890123456789012345678901234567890', // Invalid hex
        'not-an-address',
        '',
        '1234567890123456789012345678901234567890', // Missing 0x
      ];

      invalidAddresses.forEach((addr) => {
        expect(isValidAddress(addr)).toBe(false);
      });
    });
  });

  describe('isValidPrivateKey', () => {
    it('should validate valid private keys', () => {
      const wallet = generateRandomWallet();
      if (wallet.privateKey) {
        expect(isValidPrivateKey(wallet.privateKey)).toBe(true);
      }
    });

    it('should reject invalid private keys', () => {
      const invalidKeys = [
        '0x123', // Too short
        'not-a-key',
        '', // Empty
        '0xGGGG' + 'A'.repeat(60), // Invalid hex
      ];

      invalidKeys.forEach((key) => {
        expect(isValidPrivateKey(key)).toBe(false);
      });
    });
  });

  describe('getChecksumAddress', () => {
    it('should return checksummed address', () => {
      const address = '0x5aaeb6053ba3eedb6a475a1c033f2e4b130d5d22';
      const checksummed = getChecksumAddress(address);
      expect(checksummed).toBe('0x5aAeb6053ba3EEdb6A475A1c033f2E4B130d5d22');
    });

    it('should handle already checksummed addresses', () => {
      const address = '0x5aAeb6053ba3EEdb6A475A1c033f2E4B130d5d22';
      const checksummed = getChecksumAddress(address);
      expect(checksummed).toBe(address);
    });

    it('should throw on invalid address', () => {
      expect(() => getChecksumAddress('invalid')).toThrow();
    });
  });

  describe('formatAddressShort', () => {
    it('should format address in short form', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const short = formatAddressShort(address);
      expect(short).toBe('0x1234...7890');
    });

    it('should handle invalid addresses', () => {
      expect(formatAddressShort('invalid')).toBe('Invalid');
    });
  });
});

describe('Blockchain Service', () => {
  beforeAll(async () => {
    await blockchainService.initialize();
  });

  it('should initialize successfully', async () => {
    const status = await blockchainService.initialize();
    expect(status.isConnected).toBe(true);
    expect(status.url).toBeTruthy();
  });

  it('should report connection status correctly', () => {
    const isConnected = blockchainService.isConnected();
    expect(typeof isConnected).toBe('boolean');
  });

  it('should get network information', async () => {
    if (blockchainService.isConnected()) {
      const network = await blockchainService.getNetwork();
      expect(network).toContain('sepolia');
    }
  });

  describe('Encoding', () => {
    it('should encode registry data correctly', () => {
      const encoded = blockchainService.encodeRegistryData('test', {
        field: 'value',
      });
      expect(encoded).toMatch(/^0x/);
    });

    it('should encode and decode registry data', () => {
      const originalData = { type: 'test', field: 'value' };
      const encoded = blockchainService.encodeRegistryData(originalData.type, {
        field: originalData.field,
      });
      const decoded = blockchainService.decodeRegistryData(encoded);

      if (decoded) {
        expect(decoded.type).toBe(originalData.type);
        expect(decoded.field).toBe(originalData.field);
      }
    });
  });
});
