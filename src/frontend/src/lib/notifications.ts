import type { ToastNotification } from "../components/ToastNotifications";

type ShowToast = (n: Omit<ToastNotification, "id">) => string;
type DismissToast = (id: string) => void;

export const Notifications = {
  walletRecommendation(showToast: ShowToast): string {
    return showToast({
      type: "info",
      message:
        "⚡ Recommended: Use OKX Wallet for smoother and faster transactions on Arc Network.",
      sticky: false,
      duration: 6000,
    });
  },

  firstTimeUnlock(showToast: ShowToast): string {
    return showToast({
      type: "info",
      message:
        "🚀 One-time setup required: Complete a small Arc transaction to unlock lifetime drawing access.",
      sticky: false,
      duration: 5000,
    });
  },

  transactionProcessing(showToast: ShowToast): string {
    return showToast({
      type: "processing",
      message: "⏳ Transaction in progress... Please wait, do not refresh.",
      sticky: true,
    });
  },

  transactionSuccess(
    showToast: ShowToast,
    dismissToast: DismissToast,
    processingId?: string,
  ): string {
    if (processingId) dismissToast(processingId);
    return showToast({
      type: "success",
      message:
        "✅ Access unlocked! You can now draw without repeated transactions.",
      sticky: false,
      duration: 5000,
    });
  },

  transactionFailed(
    showToast: ShowToast,
    dismissToast: DismissToast,
    processingId?: string,
    onRetry?: () => void,
  ): string {
    if (processingId) dismissToast(processingId);
    return showToast({
      type: "error",
      message:
        "❌ Transaction failed. Try again or switch to OKX Wallet for better reliability.",
      sticky: true,
      action: onRetry ? { label: "Retry", onClick: onRetry } : undefined,
    });
  },

  downloadAction(showToast: ShowToast): string {
    return showToast({
      type: "info",
      message: "💾 Download requires a small network fee transaction.",
      sticky: false,
      duration: 4000,
    });
  },

  profileUpdate(showToast: ShowToast): string {
    return showToast({
      type: "info",
      message: "🧑 Profile update requires confirmation on Arc network.",
      sticky: false,
      duration: 4000,
    });
  },

  networkWarning(showToast: ShowToast): string {
    return showToast({
      type: "warning",
      message:
        "⚠️ You are not connected to Arc Testnet. Switch network for full access.",
      sticky: true,
    });
  },
};
