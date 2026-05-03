/**
 * Wallet Utilities - Browser-compatible wallet operations
 * No private key operations in frontend - sign operations must happen server-side
 */

import { ethers } from 'ethers';
import type { WalletData } from './types';

/**
 * Generate a new random wallet
 * This creates a wallet object but private key should be stored securely
 * @returns Wallet data structure
 */
export function generateRandomWallet(): WalletData {
  try {
    const wallet = ethers.Wallet.createRandom();

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
      path: wallet.mnemonic?.path,
    };
  } catch (error) {
    console.error('Failed to generate random wallet:', error);
    throw new Error('Could not generate random wallet');
  }
}

/**
 * Validate if a string is a valid Ethereum address
 * @param address - Address to validate
 * @returns Boolean indicating validity
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validate if a string is a valid private key
 * @param privateKey - Private key to validate
 * @returns Boolean indicating validity
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      return false;
    }
    // Try to create a wallet with it
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get checksum address (EIP-55 format)
 * @param address - Address to checksum
 * @returns Checksummed address
 */
export function getChecksumAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch (error) {
    console.error('Failed to get checksum address:', error);
    throw new Error('Invalid address format');
  }
}

/**
 * Browser-compatible encryption using SubtleCrypto
 * Encrypts data with a password
 * @param data - Data to encrypt
 * @param password - Password for encryption
 * @returns Encrypted data as base64 string
 */
export async function encryptData(data: string, password: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error('SubtleCrypto not available in this browser');
  }

  try {
    // Derive key from password
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('singulai-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data),
    );

    // Combine IV + encrypted data and encode to base64
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Browser-compatible decryption using SubtleCrypto
 * Decrypts data encrypted with encryptData
 * @param encryptedBase64 - Encrypted data as base64 string
 * @param password - Password for decryption
 * @returns Decrypted data
 */
export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error('SubtleCrypto not available in this browser');
  }

  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Derive key from password
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('singulai-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    // Decrypt data
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Format address for display (short format)
 * @param address - Full address
 * @returns Short format like "0x1234...5678"
 */
export function formatAddressShort(address: string): string {
  if (!isValidAddress(address)) {
    return 'Invalid';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get address from private key (for reference only)
 * WARNING: Never expose private key in frontend
 * @param privateKey - Private key
 * @returns Wallet address
 */
export function getAddressFromPrivateKey(privateKey: string): string | null {
  try {
    if (!isValidPrivateKey(privateKey)) {
      return null;
    }
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    return null;
  }
}
