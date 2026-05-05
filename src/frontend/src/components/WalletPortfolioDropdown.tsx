import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { ARC_CHAIN_ID, SUPPORTED_CHAINS } from "../lib/wagmiConfig";

interface WalletPortfolioDropdownProps {
  onDisconnectRequest: () => void;
  onClose: () => void;
}

const MOCK_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin (Arc)",
    balance: "500.00",
    color: "#2775CA",
  },
];

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function WalletPortfolioDropdown({
  onDisconnectRequest,
  onClose,
}: WalletPortfolioDropdownProps) {
  const { address, chainId } = useAccount();
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
  });
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Animate in
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const networkName =
    chainId !== undefined
      ? ((SUPPORTED_CHAINS as Record<number, string>)[chainId] ??
        "Unknown Network")
      : "Unknown Network";

  const isCorrectNetwork = chainId === ARC_CHAIN_ID;

  const explorerUrl = address
    ? `https://testnet.arcscan.app/address/${address}`
    : null;

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formattedBalance = balanceData
    ? `${(Number(balanceData.value) / 1e6).toFixed(2)} ${balanceData.symbol}`
    : balanceLoading
      ? "Loading\u2026"
      : "\u2014";

  return (
    <div
      ref={dropdownRef}
      data-ocid="wallet.dropdown"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: 320,
        borderRadius: 20,
        background: "rgba(10,8,28,0.97)",
        border: "1px solid rgba(139,92,246,0.25)",
        boxShadow:
          "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1), 0 0 40px rgba(139,92,246,0.1)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        zIndex: 1000,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : "translateY(-8px) scale(0.97)",
        transition:
          "opacity 0.22s cubic-bezier(.22,1,.36,1), transform 0.22s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {/* Header — address */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(16,185,129,0.8)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#10b981",
                letterSpacing: "0.03em",
              }}
            >
              Connected
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
              background: isCorrectNetwork
                ? "rgba(16,185,129,0.12)"
                : "rgba(245,158,11,0.12)",
              border: `1px solid ${
                isCorrectNetwork
                  ? "rgba(16,185,129,0.3)"
                  : "rgba(245,158,11,0.3)"
              }`,
              color: isCorrectNetwork ? "#10b981" : "#f59e0b",
              fontWeight: 600,
            }}
            data-ocid="wallet.network_badge"
          >
            {networkName}
          </div>
        </div>

        {/* Full address + copy */}
        <button
          type="button"
          data-ocid="wallet.copy_address_button"
          onClick={handleCopyAddress}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 13px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: "rgba(240,234,255,0.8)",
              letterSpacing: "0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              textAlign: "left",
            }}
          >
            {address ?? ""}
          </span>
          <span
            style={{
              marginLeft: 8,
              flexShrink: 0,
              color: copied ? "#10b981" : "rgba(240,234,255,0.4)",
              transition: "color 0.15s",
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>
        {copied && (
          <p
            style={{
              fontSize: 11,
              color: "#10b981",
              marginTop: 5,
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            Address copied!
          </p>
        )}

        {/* ArcScan explorer link */}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="wallet.explorer_link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              marginTop: 10,
              padding: "7px 0",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(139,92,246,0.7)",
              border: "1px solid rgba(139,92,246,0.15)",
              background: "rgba(139,92,246,0.06)",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "rgba(139,92,246,1)";
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(139,92,246,0.12)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(139,92,246,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color =
                "rgba(139,92,246,0.7)";
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(139,92,246,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(139,92,246,0.15)";
            }}
          >
            View on ArcScan
            <ExternalLinkIcon />
          </a>
        )}
      </div>

      {/* Portfolio */}
      <div style={{ padding: "16px 20px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(240,234,255,0.35)",
            marginBottom: 12,
          }}
        >
          Portfolio
        </p>

        {/* Live USDC Balance */}
        <div
          data-ocid="wallet.usdc_balance"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#2775CA,#1a5aa0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 9,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            USDC
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#f0eaff",
                fontFamily: balanceLoading ? "inherit" : "monospace",
              }}
            >
              {formattedBalance}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(240,234,255,0.4)",
                marginTop: 1,
              }}
            >
              {networkName}
            </div>
          </div>
          {balanceLoading && (
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid rgba(139,92,246,0.3)",
                borderTopColor: "#8b5cf6",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* Token list */}
        {MOCK_TOKENS.map((token, i) => (
          <div
            key={token.symbol}
            data-ocid={`wallet.token.${i + 1}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              marginBottom: i < MOCK_TOKENS.length - 1 ? 6 : 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "rgba(255,255,255,0.02)";
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `${token.color}22`,
                border: `1px solid ${token.color}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 800,
                color: token.color,
              }}
            >
              {token.symbol.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0eaff" }}>
                {token.balance} {token.symbol}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(240,234,255,0.4)",
                  marginTop: 1,
                }}
              >
                {token.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disconnect */}
      <div
        style={{
          padding: "0 20px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 14,
        }}
      >
        <button
          type="button"
          data-ocid="wallet.disconnect_button"
          onClick={onDisconnectRequest}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.18s",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.16)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Disconnect Wallet
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
