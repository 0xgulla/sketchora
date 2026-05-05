import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http } from "wagmi";

// Arc Testnet custom chain definition
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});

export const wagmiConfig = getDefaultConfig({
  appName: "Sketchora",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: false,
});

export const ARC_CHAIN_ID = 5042002;

export const SUPPORTED_CHAINS = {
  5042002: "Arc Testnet",
} as const;

export function getChainName(chainId: number | undefined): string {
  if (!chainId) return "Unknown Network";
  return (
    (SUPPORTED_CHAINS as Record<number, string>)[chainId] ?? "Unknown Network"
  );
}
