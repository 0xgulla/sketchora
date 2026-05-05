// USDC Payment utility for Arc Testnet
// IMPORTANT: Update USDC_ADDRESS to the real Arc testnet USDC contract when known.
export const USDC_ADDRESS =
  "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;
export const RECEIVER_ADDRESS =
  "0x8a2B0a2b08bc7d0E7aCeA1f1a89F97b6B2aCcAe3" as const;
export const USDC_DECIMALS = 6;
export const PAYMENT_AMOUNT = "0.1"; // USDC

/** Minimal ERC-20 ABI — only transfer + balanceOf needed */
export const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Returns true if the wallet has previously unlocked access.
 * Key is per-wallet-address so multiple wallets on the same device are tracked separately.
 */
export function checkPaidAccess(walletAddress: string): boolean {
  return (
    localStorage.getItem(`sketchora_paid_${walletAddress.toLowerCase()}`) ===
    "true"
  );
}

/** Permanently record that this wallet has unlocked access. */
export function setPaidAccess(walletAddress: string): void {
  localStorage.setItem(`sketchora_paid_${walletAddress.toLowerCase()}`, "true");
}
