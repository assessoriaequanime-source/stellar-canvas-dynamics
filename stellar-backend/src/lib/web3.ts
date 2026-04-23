import { verifyMessage } from "ethers";

export function verifyWalletSignature(message: string, signature: string, walletAddress: string): boolean {
  const recoveredAddress = verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
}
