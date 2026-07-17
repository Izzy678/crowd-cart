"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "viem/chains";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (isConnected && address) {
    const wrongChain = chainId !== monadTestnet.id;
    return (
      <div className="connect-row">
        {wrongChain ? (
          <button
            type="button"
            className="btn btn--coral btn--sm"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: monadTestnet.id })}
          >
            Switch to Monad Testnet
          </button>
        ) : (
          <span className="mono-label">{shortAddress(address)}</span>
        )}
        <button
          type="button"
          className="btn btn--soft btn--sm"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connector = connectors[0];

  return (
    <button
      type="button"
      className="btn btn--pear"
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector, chainId: monadTestnet.id })}
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
