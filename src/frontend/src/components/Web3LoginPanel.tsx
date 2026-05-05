import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useWeb3Auth } from "../hooks/useWeb3Auth";
import { ARC_CHAIN_ID, SUPPORTED_CHAINS } from "../lib/wagmiConfig";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Web3LoginPanel() {
  const { isConnected, address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { isAuthenticated, chainName, isLoading, error, signIn, logout } =
    useWeb3Auth();

  const [localError, setLocalError] = useState<string | null>(null);

  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID;

  const handleEnterApp = () => {
    if (!isConnected) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!isAuthenticated) {
      setLocalError("Please sign in first using the button below.");
      return;
    }
    setLocalError(null);
    window.history.replaceState(null, "", "/draw");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSwitchToArc = () => {
    setLocalError(null);
    try {
      switchChain({ chainId: ARC_CHAIN_ID });
    } catch {
      setLocalError(
        "Failed to switch to Arc Testnet. Please switch manually in your wallet.",
      );
    }
  };

  const handleSwitchNetwork = (id: number) => {
    try {
      switchChain({ chainId: id });
    } catch {
      setLocalError(
        "Failed to switch network. Please switch manually in your wallet.",
      );
    }
  };

  const handleSignIn = () => {
    setLocalError(null);
    void signIn();
  };

  const displayError = error ?? localError;

  if (isAuthenticated) {
    return (
      <div style={{ padding: "4px 0" }}>
        <div className="web3-info-box" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span className="web3-address-label">Address</span>
              <div className="web3-address" data-ocid="web3.wallet_address">
                {address ? truncateAddress(address) : "Connected"}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <div
              className="web3-network-badge"
              data-ocid="web3.network_badge"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: chainId === ARC_CHAIN_ID ? "#10b981" : "#f59e0b",
                  display: "inline-block",
                }}
              />
              {chainName}
            </div>
            <select
              data-ocid="web3.network_select"
              onChange={(e) => handleSwitchNetwork(Number(e.target.value))}
              value={chainId ?? ARC_CHAIN_ID}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "rgba(240,234,255,0.7)",
                fontSize: 11,
                padding: "3px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {Object.entries(SUPPORTED_CHAINS).map(([id, name]) => (
                <option key={id} value={id} style={{ background: "#1a0e2e" }}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayError && (
          <div
            className="web3-error"
            data-ocid="web3.error_state"
            style={{ marginBottom: 12 }}
          >
            {displayError}
          </div>
        )}

        <button
          type="button"
          className="web3-connect-btn"
          data-ocid="web3.launch_app_button"
          onClick={handleEnterApp}
          style={{
            marginBottom: 12,
            boxShadow: "0 0 24px rgba(16,185,129,0.4)",
          }}
        >
          ✓ Enter Sketchora
        </button>

        <button
          type="button"
          className="web3-disconnect-btn"
          data-ocid="web3.disconnect_button"
          onClick={() => void logout()}
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {displayError && (
        <div
          className="web3-error"
          data-ocid="web3.error_state"
          style={{ marginBottom: 12 }}
        >
          {displayError}
        </div>
      )}

      {isLoading && (
        <div
          data-ocid="web3.loading_state"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 0",
            color: "oklch(0.72 0.15 200)",
            fontSize: 13,
          }}
        >
          <span className="web3-loading-spinner" />
          Signing in...
        </div>
      )}

      {!isConnected && !isLoading && (
        <div data-ocid="web3.connect_wallet_button">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                type="button"
                className="web3-connect-btn"
                onClick={() => {
                  setLocalError(null);
                  openConnectModal();
                }}
                style={{ marginBottom: 16 }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M7 12L12 7L17 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 7V17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      )}

      {isConnected && isWrongNetwork && !isLoading && (
        <div
          data-ocid="web3.wrong_network_banner"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
            color: "#fbbf24",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            ⚠ Wrong Network
          </div>
          <div
            style={{
              marginBottom: 10,
              color: "rgba(251,191,36,0.8)",
              fontSize: 12,
            }}
          >
            Please switch to Arc Testnet to continue.
          </div>
          <button
            type="button"
            data-ocid="web3.switch_network_button"
            onClick={handleSwitchToArc}
            disabled={isSwitching}
            style={{
              background: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 999,
              color: "#fbbf24",
              cursor: isSwitching ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              padding: "6px 16px",
              transition: "all 0.18s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isSwitching ? (
              <>
                <span
                  className="web3-loading-spinner"
                  style={{ width: 12, height: 12 }}
                />{" "}
                Switching...
              </>
            ) : (
              "Switch to Arc Testnet"
            )}
          </button>
        </div>
      )}

      {isConnected && !isWrongNetwork && !isLoading && (
        <>
          <div className="web3-info-box" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              <span className="web3-address-label" style={{ margin: 0 }}>
                Connected
              </span>
            </div>
            <div className="web3-address" data-ocid="web3.connected_address">
              {address ? truncateAddress(address) : ""}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <div
                className="web3-network-badge"
                data-ocid="web3.network_badge"
              >
                {chainName}
              </div>
              <select
                data-ocid="web3.network_select"
                onChange={(e) => handleSwitchNetwork(Number(e.target.value))}
                value={chainId ?? ARC_CHAIN_ID}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "rgba(240,234,255,0.7)",
                  fontSize: 11,
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {Object.entries(SUPPORTED_CHAINS).map(([id, name]) => (
                  <option key={id} value={id} style={{ background: "#1a0e2e" }}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="web3-connect-btn"
            data-ocid="web3.sign_in_button"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            Sign In With Wallet
          </button>

          <button
            type="button"
            className="web3-disconnect-btn"
            data-ocid="web3.disconnect_button"
            onClick={() => void logout()}
            style={{ marginTop: 8 }}
          >
            Disconnect
          </button>
        </>
      )}

      <p
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "oklch(0.45 0.005 240)",
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        Supports MetaMask, WalletConnect, and more.
        <br />
        Default network: Arc Testnet.
      </p>
    </div>
  );
}
