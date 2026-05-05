import { useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  ERC20_ABI,
  PAYMENT_AMOUNT,
  RECEIVER_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  setPaidAccess,
} from "../lib/usdcPayment";

export type TxStep =
  | "idle"
  | "processing"
  | "waiting_wallet"
  | "submitted"
  | "confirming"
  | "success"
  | "failed";

export type TxPurpose = "unlock" | "download" | "profile";

export interface PendingTxRecord {
  txHash: `0x${string}`;
  walletAddress: string;
  timestamp: number;
  purpose: TxPurpose;
}

const PENDING_TX_KEY = "pendingTx";
const TX_TIMEOUT_MS = 60_000; // 60s
const TX_EXPIRE_MS = 60 * 60 * 1000; // 1 hour
const GAS_FALLBACK = 100_000n;
const GAS_BUFFER = 1.2;
const WALLET_POPUP_TIMEOUT_MS = 10_000; // 10s to detect no popup
const MAX_GAS_ESTIMATE_RETRIES = 2;

export interface UseUSDCPaymentResult {
  sendPayment: (purpose?: TxPurpose) => void;
  txStep: TxStep;
  txHash: `0x${string}` | undefined;
  txError: string | undefined;
  isPending: boolean;
  reset: () => void;
}

/**
 * Hook that sends 0.1 USDC to RECEIVER_ADDRESS via ERC-20 transfer.
 * - Estimates gas before sending (with 20% buffer + fallback)
 * - Prevents duplicate sends via isPending guard
 * - Shows granular step-by-step status (TxStep)
 * - Persists pending tx to localStorage for resume-on-refresh
 * - 60-second timeout on waitForReceipt
 */
export function useUSDCPayment(): UseUSDCPaymentResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txError, setTxError] = useState<string | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const purposeRef = useRef<TxPurpose>("unlock");

  const {
    writeContractAsync,
    data: txHashFromWrite,
    reset: resetWrite,
  } = useWriteContract();

  // Separate txHash state (from write OR from localStorage resume)
  const [resolvedTxHash, setResolvedTxHash] = useState<
    `0x${string}` | undefined
  >(undefined);

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: resolvedTxHash });

  // ─── Sync wagmi confirm state → TxStep ──────────────────────────────
  useEffect(() => {
    if (!resolvedTxHash) return;

    if (isConfirming) {
      setTxStep("confirming");
    }
    if (isConfirmed) {
      console.log("[Sketchora TX] Tx confirmed:", {
        txHash: resolvedTxHash,
      });
      setTxStep("success");
      setIsPending(false);
      // Persist paid access for unlock
      if (address && purposeRef.current === "unlock") {
        setPaidAccess(address);
      }
      // Clear pending tx from storage
      localStorage.removeItem(PENDING_TX_KEY);
    }
    if (isReceiptError) {
      const msg =
        receiptError instanceof Error
          ? receiptError.message
          : "Transaction failed";
      console.error("[Sketchora TX] Error:", receiptError);
      setTxStep("failed");
      setTxError("Transaction failed. Try again.");
      setIsPending(false);
      localStorage.removeItem(PENDING_TX_KEY);
      void msg;
    }
  }, [
    isConfirming,
    isConfirmed,
    isReceiptError,
    receiptError,
    resolvedTxHash,
    address,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // Sync write hash → resolvedTxHash
  useEffect(() => {
    if (txHashFromWrite) {
      setResolvedTxHash(txHashFromWrite);
    }
  }, [txHashFromWrite]);

  // ─── Resume pending tx from localStorage on mount ────────────────────
  useEffect(() => {
    if (!address) return;
    try {
      const raw = localStorage.getItem(PENDING_TX_KEY);
      if (!raw) return;
      const record: PendingTxRecord = JSON.parse(raw);
      // Expired?
      if (Date.now() - record.timestamp > TX_EXPIRE_MS) {
        localStorage.removeItem(PENDING_TX_KEY);
        return;
      }
      // Different wallet?
      if (record.walletAddress.toLowerCase() !== address.toLowerCase()) return;

      console.log("[Sketchora TX] Resumed tracking from storage:", {
        txHash: record.txHash,
      });
      purposeRef.current = record.purpose;
      setResolvedTxHash(record.txHash);
      setIsPending(true);
      setTxStep("confirming");
    } catch {
      localStorage.removeItem(PENDING_TX_KEY);
    }
    // only run on mount / address change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // ─── Main send flow ───────────────────────────────────────────────────
  const sendPayment = useCallback(
    async (purpose: TxPurpose = "unlock") => {
      if (isPending) return; // duplicate guard
      if (!address) {
        setTxError(
          "No wallet detected. Install MetaMask or use WalletConnect.",
        );
        setTxStep("failed");
        return;
      }

      console.log("[Sketchora TX] Starting payment:", {
        purpose,
        walletAddress: address,
      });

      purposeRef.current = purpose;
      setIsPending(true);
      setTxError(undefined);
      setResolvedTxHash(undefined);
      setTxStep("processing");

      try {
        // Step 1: Estimate gas (with retry)
        const amount = parseUnits(PAYMENT_AMOUNT, USDC_DECIMALS);
        let gasLimit = GAS_FALLBACK;
        for (
          let attempt = 1;
          attempt <= MAX_GAS_ESTIMATE_RETRIES + 1;
          attempt++
        ) {
          try {
            if (!publicClient) break;
            const estimate = await publicClient.estimateGas({
              account: address,
              to: USDC_ADDRESS,
              data: "0x" as `0x${string}`,
            });
            gasLimit = BigInt(Math.ceil(Number(estimate) * GAS_BUFFER));
            console.log("[Sketchora TX] Gas estimate:", gasLimit);
            break;
          } catch (gasErr) {
            if (attempt <= MAX_GAS_ESTIMATE_RETRIES) {
              console.log(
                "[Sketchora TX] Retrying gas estimate, attempt:",
                attempt,
              );
              await new Promise((r) => setTimeout(r, 1000));
            } else {
              console.log(
                "[Sketchora TX] Gas estimate failed, using fallback:",
                GAS_FALLBACK,
              );
              void gasErr;
            }
          }
        }

        // Step 2: Request wallet signature
        setTxStep("waiting_wallet");

        // Wallet popup timeout — if no hash within 10s, stay in waiting_wallet state
        const walletTimeoutId = setTimeout(() => {
          // Only update if still waiting
          setTxStep((prev) =>
            prev === "waiting_wallet" ? "waiting_wallet" : prev,
          );
        }, WALLET_POPUP_TIMEOUT_MS);

        let hash: `0x${string}`;
        try {
          hash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [RECEIVER_ADDRESS, amount],
            gas: gasLimit,
          });
        } catch (writeErr) {
          clearTimeout(walletTimeoutId);
          throw writeErr;
        }
        clearTimeout(walletTimeoutId);

        console.log("[Sketchora TX] Tx submitted:", hash);

        // Step 3: Tx submitted — store in localStorage for persistence
        const record: PendingTxRecord = {
          txHash: hash,
          walletAddress: address,
          timestamp: Date.now(),
          purpose,
        };
        localStorage.setItem(PENDING_TX_KEY, JSON.stringify(record));

        setResolvedTxHash(hash);
        setTxStep("submitted");

        // Brief pause to show "submitted" step, then wait for confirmation
        await new Promise((r) => setTimeout(r, 1200));
        setTxStep("confirming");

        // Step 4: Wait with timeout
        if (!publicClient) throw new Error("No public client");
        const receiptPromise = publicClient.waitForTransactionReceipt({ hash });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "TIMEOUT: Transaction is taking longer than expected. Check ArcScan for status.",
                ),
              ),
            TX_TIMEOUT_MS,
          ),
        );

        try {
          const receipt = await Promise.race([receiptPromise, timeoutPromise]);
          console.log("[Sketchora TX] Tx confirmed:", {
            txHash: hash,
            blockNumber: receipt.blockNumber,
          });
          if (purpose === "unlock" && address) setPaidAccess(address);
          localStorage.removeItem(PENDING_TX_KEY);
          setTxStep("success");
          setIsPending(false);
        } catch (receiptErr) {
          const msg = receiptErr instanceof Error ? receiptErr.message : "";
          if (msg.startsWith("TIMEOUT:")) {
            // Timeout — don't treat as hard failure, user can check explorer
            setTxError(msg.replace("TIMEOUT: ", ""));
            setTxStep("failed");
            setIsPending(false);
          } else {
            throw receiptErr;
          }
        }
      } catch (err) {
        console.error("[Sketchora TX] Error:", err);
        setIsPending(false);
        localStorage.removeItem(PENDING_TX_KEY);

        const msg = err instanceof Error ? err.message : "Transaction failed";
        let friendly = "Transaction failed. Try again.";

        if (
          msg.toLowerCase().includes("rejected") ||
          msg.toLowerCase().includes("denied") ||
          msg.toLowerCase().includes("user refused") ||
          msg.toLowerCase().includes("user rejected")
        ) {
          friendly = "You rejected the transaction. Please try again.";
        } else if (msg.toLowerCase().includes("insufficient")) {
          friendly =
            "Insufficient USDC balance. Please add USDC to your wallet on Arc Testnet.";
        } else if (
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("chain")
        ) {
          friendly = "Wrong network. Please switch to Arc Testnet.";
        } else if (msg.toLowerCase().includes("wallet not found")) {
          friendly =
            "No wallet detected. Install MetaMask or use WalletConnect.";
        }

        setTxStep("failed");
        setTxError(friendly);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending, address, writeContractAsync, publicClient],
  );

  const reset = useCallback(() => {
    setTxStep("idle");
    setTxError(undefined);
    setIsPending(false);
    setResolvedTxHash(undefined);
    resetWrite();
  }, [resetWrite]);

  return {
    sendPayment: sendPayment as (purpose?: TxPurpose) => void,
    txStep,
    txHash: resolvedTxHash,
    txError,
    isPending,
    reset,
  };
}
