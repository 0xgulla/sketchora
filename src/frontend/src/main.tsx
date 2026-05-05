import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import Root from "./Root";
import { wagmiConfig } from "./lib/wagmiConfig";
import "./index.css";
import { ToastProvider } from "./components/ToastNotifications";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  </QueryClientProvider>,
);
