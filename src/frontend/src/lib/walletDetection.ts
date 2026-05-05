declare global {
  interface Window {
    okxwallet?: { isOkxWallet?: boolean };
    ethereum?: {
      isMetaMask?: boolean;
      isOkxWallet?: boolean;
      providerMap?: Map<string, unknown>;
      providers?: Array<{ isMetaMask?: boolean; isOkxWallet?: boolean }>;
    };
  }
}

export function isOKXWallet(): boolean {
  if (typeof window === "undefined") return false;
  if (window.okxwallet != null) return true;
  if (window.ethereum?.isOkxWallet === true) return true;
  if (window.ethereum?.providerMap?.has("OKX") === true) return true;
  // Check in providers array (some injectors expose multiple providers)
  const providers = window.ethereum?.providers;
  if (Array.isArray(providers)) {
    return providers.some((p) => p.isOkxWallet === true);
  }
  return false;
}

export function getWalletName():
  | "OKX"
  | "MetaMask"
  | "WalletConnect"
  | "Unknown" {
  if (typeof window === "undefined") return "Unknown";
  if (isOKXWallet()) return "OKX";
  if (window.ethereum?.isMetaMask === true) return "MetaMask";
  // WalletConnect doesn't inject window.ethereum
  if (window.ethereum == null) return "WalletConnect";
  return "Unknown";
}
