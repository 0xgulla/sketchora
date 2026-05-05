import type React from "react";
import type { TxStep } from "../hooks/useUSDCPayment";

// Re-export TxStep for legacy consumers
export type { TxStep };
// Legacy compat alias
export type TxState = "idle" | "pending" | "success" | "failed";

interface TransactionModalProps {
  /** Granular step state (new) */
  txStep?: TxStep;
  /** Legacy state prop (mapped to txStep internally) */
  state?: TxState;
  txHash?: `0x${string}`;
  error?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

const ARC_SCAN = "https://testnet.arcscan.app";

export default function TransactionModal({
  txStep: txStepProp,
  state,
  txHash,
  error,
  onRetry,
  onClose,
}: TransactionModalProps) {
  // Resolve effective step — prefer txStep, fall back to mapping state
  let step: TxStep = txStepProp ?? "idle";
  if (!txStepProp && state) {
    const legacyMap: Record<TxState, TxStep> = {
      idle: "idle",
      pending: "confirming",
      success: "success",
      failed: "failed",
    };
    step = legacyMap[state];
  }

  if (step === "idle") return null;

  const isActive = [
    "processing",
    "waiting_wallet",
    "submitted",
    "confirming",
  ].includes(step);
  const isSuccess = step === "success";
  const isFailed = step === "failed";

  const borderColor = isSuccess
    ? "rgba(16,185,129,0.5)"
    : isFailed
      ? "rgba(239,68,68,0.5)"
      : "rgba(139,92,246,0.5)";

  const glowColor = isSuccess
    ? "rgba(16,185,129,0.2)"
    : isFailed
      ? "rgba(239,68,68,0.2)"
      : "rgba(139,92,246,0.2)";

  return (
    <div
      data-ocid="tx.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(4,6,20,0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        animation: "txOverlayIn 0.2s ease-out both",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(15,10,30,0.98), rgba(10,8,22,0.98))",
          border: `1px solid ${borderColor}`,
          borderRadius: 24,
          padding: "40px 36px",
          width: "min(440px, 90vw)",
          textAlign: "center",
          boxShadow: `0 0 60px ${glowColor}, 0 20px 60px rgba(0,0,0,0.7)`,
          animation: "txCardIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* ── ICON ── */}
        <div style={{ marginBottom: 20 }}>
          {/* Processing: purple spinner */}
          {step === "processing" && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                borderRadius: "50%",
                border: "3px solid rgba(139,92,246,0.2)",
                borderTopColor: "#8b5cf6",
                animation: "txSpin 0.9s linear infinite",
              }}
            />
          )}

          {/* Waiting for wallet: wallet icon */}
          {step === "waiting_wallet" && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                borderRadius: "50%",
                background: "rgba(139,92,246,0.12)",
                border: "2px solid rgba(139,92,246,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "txWalletPulse 1.4s ease-in-out infinite",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          )}

          {/* Submitted: orbit dots */}
          {step === "submitted" && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                borderRadius: "50%",
                background: "rgba(96,165,250,0.1)",
                border: "2px solid rgba(96,165,250,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          )}

          {/* Confirming: dual-ring spinner */}
          {step === "confirming" && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "3px solid rgba(139,92,246,0.15)",
                  borderTopColor: "#8b5cf6",
                  animation: "txSpin 0.9s linear infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 10,
                  borderRadius: "50%",
                  border: "2px solid rgba(96,165,250,0.15)",
                  borderBottomColor: "#60a5fa",
                  animation: "txSpin 1.4s linear infinite reverse",
                }}
              />
            </div>
          )}

          {/* Success */}
          {isSuccess && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "2px solid rgba(16,185,129,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation:
                  "txBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}

          {/* Failed */}
          {isFailed && (
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                borderRadius: "50%",
                background: "rgba(239,68,68,0.12)",
                border: "2px solid rgba(239,68,68,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation:
                  "txBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          )}
        </div>

        {/* ── TITLE ── */}
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#f0eaff",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          {step === "processing" && "Processing Transaction..."}
          {step === "waiting_wallet" && "Waiting for Wallet"}
          {step === "submitted" && "Transaction Submitted..."}
          {step === "confirming" && "Confirming on Blockchain..."}
          {isSuccess && "Unlocked Forever 🚀"}
          {isFailed && "Transaction Failed ❌"}
        </h3>

        {/* ── SUB-TEXT ── */}
        <p
          style={{
            fontSize: 14,
            color: "rgba(240,234,255,0.6)",
            margin: "0 0 8px",
            lineHeight: 1.6,
          }}
        >
          {step === "processing" &&
            "Estimating gas and preparing your transaction..."}
          {step === "waiting_wallet" && (
            <>
              Please confirm the transaction in your wallet.
              <br />
              <span style={{ color: "rgba(196,181,253,0.5)", fontSize: 12 }}>
                The wallet popup should have appeared.
              </span>
            </>
          )}
          {step === "submitted" && txHash && (
            <>
              Hash:{" "}
              <span
                style={{
                  fontFamily: "monospace",
                  color: "#93c5fd",
                  fontSize: 12,
                }}
              >
                {truncateHash(txHash)}
              </span>
            </>
          )}
          {step === "submitted" &&
            !txHash &&
            "Waiting for network acknowledgment..."}
          {step === "confirming" &&
            "Waiting for on-chain confirmation. This may take a moment..."}
          {isSuccess && "Payment of 0.1 USDC confirmed on Arc Testnet."}
          {isFailed && (error ?? "The transaction could not be completed.")}
        </p>

        {/* ── TX HASH LINK (submitted / confirming) ── */}
        {(step === "submitted" || step === "confirming") && txHash && (
          <a
            href={`${ARC_SCAN}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 8,
              fontSize: 12,
              color: "#a78bfa",
              textDecoration: "none",
              opacity: 0.8,
            }}
          >
            View on ArcScan ↗
          </a>
        )}

        {/* ── SUCCESS LINK ── */}
        {isSuccess && txHash && (
          <a
            href={`${ARC_SCAN}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="tx.arcscan_link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 12,
              fontSize: 13,
              color: "#6ee7b7",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View on ArcScan ↗
          </a>
        )}

        {/* ── USDC badge (active states) ── */}
        {isActive && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 16,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.3)",
              fontSize: 12,
              color: "#c4b5fd",
              fontWeight: 600,
            }}
          >
            <img
              src="/assets/arc-logo.png"
              alt="Arc"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            0.1 USDC · Arc Testnet
          </div>
        )}

        {/* ── STEP PROGRESS DOTS ── */}
        {isActive && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 20,
            }}
          >
            {(
              [
                "processing",
                "waiting_wallet",
                "submitted",
                "confirming",
              ] as TxStep[]
            ).map((s, i) => {
              const stepIndex = [
                "processing",
                "waiting_wallet",
                "submitted",
                "confirming",
              ].indexOf(step);
              const dotActive = i <= stepIndex;
              return (
                <div
                  key={s}
                  style={{
                    width: dotActive ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: dotActive ? "#8b5cf6" : "rgba(139,92,246,0.2)",
                    transition: "all 0.3s ease",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* ── ACTIONS (failed) ── */}
        {isFailed && (
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 24,
              justifyContent: "center",
            }}
          >
            {onRetry && (
              <button
                type="button"
                data-ocid="tx.retry_button"
                onClick={onRetry}
                style={{
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                  transition: "transform 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                Try Again
              </button>
            )}
            {onClose && (
              <button
                type="button"
                data-ocid="tx.cancel_button"
                onClick={onClose}
                style={{
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* ── DISMISS (success) ── */}
        {isSuccess && onClose && (
          <button
            type="button"
            data-ocid="tx.close_button"
            onClick={onClose}
            style={{
              marginTop: 20,
              padding: "10px 28px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
              transition: "transform 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
            }}
          >
            Continue Drawing ✨
          </button>
        )}
      </div>

      <style>{`
        @keyframes txOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes txCardIn {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes txSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes txBounceIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes txWalletPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(139,92,246,0); }
        }
      `}</style>
    </div>
  ) as React.ReactElement;
}
