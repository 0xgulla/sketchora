import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect, useEnsName, useSignMessage } from "wagmi";
import { getChainName } from "../lib/wagmiConfig";

const SESSION_KEY = "sketchora_web3_session";
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface Web3Session {
  sessionToken: string;
  walletAddress: string;
  chainId: number;
  createdAt: number;
  lastLogin: number;
}

export interface Web3AuthState {
  isAuthenticated: boolean;
  sessionToken: string | null;
  walletAddress: string | null;
  ensName: string | null;
  chainName: string;
  chainId: number | undefined;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

function buildSiweMessage(address: string, nonce: string): string {
  const domain = window.location.host;
  const origin = window.location.origin;
  const issuedAt = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Sketchora — your creative drawing workspace.",
    "",
    `URI: ${origin}`,
    "Version: 1",
    "Chain ID: 5042002",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

function readStoredSession(): Web3Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Web3Session>;
    const age = Date.now() - (parsed.lastLogin ?? 0);
    if (age < SESSION_TTL && parsed.sessionToken && parsed.walletAddress) {
      return parsed as Web3Session;
    }
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch {
    return null;
  }
}

export function useWeb3Auth(): Web3AuthState {
  const { address, isConnected, chain, status } = useAccount();
  const { data: ensData } = useEnsName({ address });
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<Web3Session | null>(() =>
    readStoredSession(),
  );
  // isLoading is true while the wallet connection is being established OR
  // while Wagmi is still reconnecting (hydrating from a prior session).
  const wagmiHydrating = status === "connecting" || status === "reconnecting";
  const [isLoading, setIsLoading] = useState(wagmiHydrating);
  const [error, setError] = useState<string | null>(null);

  // Keep isLoading in sync with Wagmi hydration status.
  // Once Wagmi resolves to "connected" or "disconnected", loading ends.
  useEffect(() => {
    if (!wagmiHydrating) {
      setIsLoading(false);
    }
  }, [wagmiHydrating]);

  // Invalidate session if wallet disconnects externally
  useEffect(() => {
    if (!isConnected && session) {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
  }, [isConnected, session]);

  // Auto-sign-in: when wallet connects and no valid session exists yet,
  // create a lightweight session so user doesn't have to click "Sign In"
  useEffect(() => {
    if (isConnected && address && !session && !isLoading) {
      const autoSession: Web3Session = {
        sessionToken: [
          "web3",
          address.toLowerCase(),
          Date.now(),
          Math.random().toString(36).substring(2, 10),
        ].join("_"),
        walletAddress: address,
        chainId: chain?.id ?? 5042002,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(autoSession));
      setSession(autoSession);
    }
  }, [isConnected, address, session, isLoading, chain?.id]);

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const nonce = Math.random().toString(36).substring(2, 18);
      const message = buildSiweMessage(address, nonce);
      const signature = await signMessageAsync({ message });
      void signature;

      const token = [
        "web3",
        address.toLowerCase(),
        Date.now(),
        Math.random().toString(36).substring(2, 10),
      ].join("_");

      const newSession: Web3Session = {
        sessionToken: token,
        walletAddress: address,
        chainId: chain?.id ?? 5042002,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      if (
        msg.includes("rejected") ||
        msg.includes("denied") ||
        msg.includes("cancel") ||
        msg.includes("User rejected")
      ) {
        setError("Signature request was rejected. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, chain, signMessageAsync]);

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    disconnect();
  }, [disconnect]);

  const isAuthenticated =
    session !== null &&
    isConnected &&
    !!address &&
    address.toLowerCase() === session.walletAddress.toLowerCase();

  const walletAddress = isConnected ? (address ?? null) : null;
  const chainName = getChainName(chain?.id);

  return {
    isAuthenticated,
    sessionToken: session?.sessionToken ?? null,
    walletAddress,
    ensName: ensData ?? null,
    chainName,
    chainId: chain?.id,
    isLoading,
    error,
    signIn,
    logout,
  };
}
