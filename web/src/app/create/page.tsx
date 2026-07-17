"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Hex } from "viem";
import {
  crowdCartAbi,
  crowdCartAddress,
  isCrowdCartConfigured,
  rememberCartId,
} from "@/lib/contracts";
import { monToWei } from "@/lib/format";

export default function CreatePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [hours, setHours] = useState("24");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } =
    useWriteContract();
  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: crowdCartAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "CartCreated") {
          const args = decoded.args as unknown as { cartId: bigint };
          rememberCartId(args.cartId);
          router.push(`/cart/${args.cartId}`);
          return;
        }
      } catch {
        // not our event
      }
    }
  }, [receipt, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      setError("Connect your wallet first.");
      return;
    }
    if (!isCrowdCartConfigured()) {
      setError(
        "Contract not configured. Deploy CrowdCart, then set NEXT_PUBLIC_CROWDCART_ADDRESS to the 0x… contract address (40 hex chars after 0x) — not your private key.",
      );
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the cart a title.");
      return;
    }

    let targetWei: bigint;
    try {
      targetWei = monToWei(target);
    } catch {
      setError("Invalid target amount.");
      return;
    }
    if (targetWei <= 0n) {
      setError("Target must be greater than zero.");
      return;
    }

    const hrs = Number(hours);
    if (!Number.isFinite(hrs) || hrs <= 0) {
      setError("Deadline hours must be greater than zero.");
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + Math.floor(hrs * 3600));

    writeContract({
      address: crowdCartAddress,
      abi: crowdCartAbi,
      functionName: "createCart",
      args: [trimmed, targetWei, deadline],
    });
  }

  return (
    <div className="workbench">
      <div className="panel">
        <h1 className="panel-title">Create a cart</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
          You&apos;re the organizer. When the target is hit, you withdraw the
          full pot.
        </p>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="title">What are you buying?</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shared vacuum for the apartment"
              maxLength={80}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="target">Target (MON)</label>
            <input
              id="target"
              type="number"
              min="0"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="hours">Deadline (hours from now)</label>
            <input
              id="hours"
              type="number"
              min="0.1"
              step="0.1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--pear"
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "Creating…" : "Create cart"}
          </button>
        </form>

        {(error || writeError) && (
          <p className="status status-error">
            {error ?? writeError?.message ?? "Transaction failed"}
          </p>
        )}
        {hash && (
          <p className="status">
            Tx: <span className="mono-label">{(hash as Hex).slice(0, 10)}…</span>
          </p>
        )}
      </div>
    </div>
  );
}
