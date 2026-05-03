/**
 * Smart Contract Definitions
 * Contract addresses and ABIs for Sepolia testnet
 */

import type { ContractConfig } from './types';

export const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://rpc.sepolia.org',
  'https://1rpc.io/sepolia',
];

export const SGL_TOKEN_ADDRESS = '0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1';
export const INITIAL_SGL_BALANCE = 10000;
export const GAS_ETH_AMOUNT = '0.0005'; // ETH for gas sent with each SGL transfer

export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export const CONTRACTS: Record<string, ContractConfig> = {
  AvatarBase: {
    name: 'AvatarBase',
    address: '0x95F531cafca627A447C0F1119B8b6aCC730163E5',
    abi: [
      'function createAvatar(string memory _name, string memory _metadataHash) public returns (uint256)',
      'function getAvatar(uint256 _avatarId) public view returns (string memory name, string memory metadataHash, address owner, uint256 createdAt)',
      'function totalAvatars() public view returns (uint256)',
      'function avatarOwner(uint256 _avatarId) public view returns (address)',
      'event AvatarCreated(uint256 indexed avatarId, address indexed owner, string name)',
    ],
  },
  TimeCapsule: {
    name: 'TimeCapsule',
    address: '0x6A58aD664071d450cF7e794Dac5A13e3a1DeD172',
    abi: [
      'function createCapsule(uint256 _avatarId, string memory _contentHash, uint256 _unlockTime, address _recipient) public returns (uint256)',
      'function getCapsule(uint256 _capsuleId) public view returns (uint256 avatarId, string memory contentHash, uint256 unlockTime, address recipient, bool isOpened)',
      'function openCapsule(uint256 _capsuleId) public',
      'function canOpen(uint256 _capsuleId) public view returns (bool)',
      'event CapsuleCreated(uint256 indexed capsuleId, uint256 indexed avatarId, uint256 unlockTime)',
    ],
  },
  DigitalLegacy: {
    name: 'DigitalLegacy',
    address: '0x0Ee8f5dC7E9BC9AF344eB987B8363b33E737b757',
    abi: [
      'function createLegacy(uint256 _avatarId, string memory _legacyHash, address[] memory _heirs) public returns (uint256)',
      'function getLegacy(uint256 _legacyId) public view returns (uint256 avatarId, string memory legacyHash, address[] memory heirs, uint256 createdAt)',
      'function addHeir(uint256 _legacyId, address _heir) public',
      'function removeHeir(uint256 _legacyId, address _heir) public',
      'event LegacyCreated(uint256 indexed legacyId, uint256 indexed avatarId)',
    ],
  },
  AvatarWalletLink: {
    name: 'AvatarWalletLink',
    address: '0x9F475e5D174577f2FB17a9D94a8093e2D8c9ED41',
    abi: [
      'function linkWallet(uint256 _avatarId) public',
      'function unlinkWallet(uint256 _avatarId) public',
      'function getLinkedAvatar(address _wallet) public view returns (uint256)',
      'function isLinked(address _wallet) public view returns (bool)',
      'event WalletLinked(address indexed wallet, uint256 indexed avatarId)',
    ],
  },
};

/**
 * Utility to get a contract config by name
 */
export function getContractConfig(name: keyof typeof CONTRACTS): ContractConfig {
  const config = CONTRACTS[name];
  if (!config) {
    throw new Error(`Contract ${name} not found in configuration`);
  }
  return config;
}
