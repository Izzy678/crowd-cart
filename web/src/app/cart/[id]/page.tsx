"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  crowdCartAbi,
  crowdCartAddress,
  isCrowdCartConfigured,
  parseCartView,
  rememberCartId,
} from "@/lib/contracts";
import {
  formatDeadline,
  monToWei,
  progressPct,
  shortAddress,
  weiToMon,
} from "@/lib/format";

export default function CartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cartId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("0.1");
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (cartId !== null) rememberCartId(cartId);
  }, [cartId]);

  const {
    data: cart,
    refetch: refetchCart,
    isLoading,
    error: readError,
  } = useReadContract({
    address: crowdCartAddress,
    abi: crowdCartAbi,
    functionName: "getCart",
    args: cartId !== null ? [cartId] : undefined,
    query: { enabled: cartId !== null && isCrowdCartConfigured() },
  });

  const { data: myContribution, refetch: refetchMine } = useReadContract({
    address: crowdCartAddress,
    abi: crowdCartAbi,
    functionName: "contributionOf",
    args:
      cartId !== null && address
        ? [cartId, address]
        : undefined,
    query: { enabled: cartId !== null && !!address && isCrowdCartConfigured() },
  });

  const { writeContract, data: hash, isPending, error: writeError, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (!isSuccess) return;
    refetchCart();
    refetchMine();
    reset();
  }, [isSuccess, refetchCart, refetchMine, reset]);

  const view = parseCartView(cart);

  if (cartId === null) {
    return (
      <div className="workbench">
        <div className="panel">
          <h1 className="panel-title">Invalid cart</h1>
          <p className="muted">That cart id is not a number.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="workbench">
        <div className="panel">
          <p className="muted">Loading cart…</p>
        </div>
      </div>
    );
  }

  if (readError || !view) {
    return (
      <div className="workbench">
        <div className="panel">
          <h1 className="panel-title">Cart not found</h1>
          <p className="status status-error">
            {readError?.message ??
              "Could not read this cart. Is the contract address set?"}
          </p>
        </div>
      </div>
    );
  }

  const { organizer, target, deadline, raised, withdrawn, refundsOpen, title } =
    view;
  const now = Math.floor(Date.now() / 1000);
  const pastDeadline = now > Number(deadline);
  const funded = raised >= target;
  const isOrganizer =
    !!address && address.toLowerCase() === organizer.toLowerCase();
  const pct = progressPct(raised, target);

  function run(fn: () => void) {
    setActionError(null);
    if (!isConnected) {
      setActionError("Connect your wallet first.");
      return;
    }
    if (!isCrowdCartConfigured()) {
      setActionError(
        "Contract not configured. Set NEXT_PUBLIC_CROWDCART_ADDRESS to the deployed 0x address.",
      );
      return;
    }
    fn();
  }

  function onContribute(e: React.FormEvent) {
    e.preventDefault();
    run(() => {
      let value: bigint;
      try {
        value = monToWei(amount);
      } catch {
        setActionError("Invalid amount.");
        return;
      }
      if (value <= 0n) {
        setActionError("Contribute more than zero.");
        return;
      }
      writeContract({
        address: crowdCartAddress,
        abi: crowdCartAbi,
        functionName: "contribute",
        args: [cartId!],
        value,
      });
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="workbench">
      <div className="panel">
        <p className="mono-label">Cart #{id}</p>
        <h1 className="panel-title">{title}</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Organizer {shortAddress(organizer)}
        </p>

        <div className="stat-row">
          <div className="stat">
            <div className="stat-label">Raised</div>
            <div className="stat-value">{weiToMon(raised)} MON</div>
          </div>
          <div className="stat cyan">
            <div className="stat-label">Target</div>
            <div className="stat-value">{weiToMon(target)} MON</div>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-meta">
            <span>{pct.toFixed(1)}% funded</span>
            <span>Deadline {formatDeadline(deadline)}</span>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuenow={pct}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <p className="muted">
          Status:{" "}
          {withdrawn
            ? "Withdrawn by organizer"
            : refundsOpen
              ? "Refunds open"
              : funded
                ? "Target met — ready to withdraw"
                : pastDeadline
                  ? "Deadline passed — underfunded"
                  : "Open for contributions"}
        </p>

        {address && (
          <p className="muted">
            Your contribution: {weiToMon(myContribution as bigint | undefined)}{" "}
            MON
          </p>
        )}

        <div className="action-row">
          <button type="button" className="btn btn--soft btn--sm" onClick={copyLink}>
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
      </div>

      {!withdrawn && !refundsOpen && !pastDeadline && (
        <div className="panel">
          <h2 className="panel-title" style={{ fontSize: "1.2rem" }}>
            Contribute
          </h2>
          <form onSubmit={onContribute}>
            <div className="field">
              <label htmlFor="amount">Amount (MON)</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn--cyan"
              disabled={isPending || isConfirming}
            >
              {isPending || isConfirming ? "Confirming…" : "Contribute"}
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title" style={{ fontSize: "1.2rem" }}>
          Settle
        </h2>
        <div className="action-row">
          {isOrganizer && funded && !withdrawn && !refundsOpen && (
            <button
              type="button"
              className="btn btn--pear"
              disabled={isPending || isConfirming}
              onClick={() =>
                run(() =>
                  writeContract({
                    address: crowdCartAddress,
                    abi: crowdCartAbi,
                    functionName: "withdraw",
                    args: [cartId],
                  }),
                )
              }
            >
              Withdraw pot
            </button>
          )}

          {!withdrawn &&
            (refundsOpen || (pastDeadline && !funded)) && (
              <>
                {!refundsOpen && (
                  <button
                    type="button"
                    className="btn btn--soft"
                    disabled={isPending || isConfirming}
                    onClick={() =>
                      run(() =>
                        writeContract({
                          address: crowdCartAddress,
                          abi: crowdCartAbi,
                          functionName: "openRefunds",
                          args: [cartId],
                        }),
                      )
                    }
                  >
                    Open refunds
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--coral"
                  disabled={isPending || isConfirming}
                  onClick={() =>
                    run(() =>
                      writeContract({
                        address: crowdCartAddress,
                        abi: crowdCartAbi,
                        functionName: "claimRefund",
                        args: [cartId],
                      }),
                    )
                  }
                >
                  Claim refund
                </button>
              </>
            )}

          {withdrawn && (
            <p className="muted">This cart is settled — pot withdrawn.</p>
          )}
          {!isOrganizer && funded && !withdrawn && (
            <p className="muted">Target met. Waiting on the organizer to withdraw.</p>
          )}
          {!pastDeadline && !funded && !withdrawn && (
            <p className="muted">Keep sharing until the target is met.</p>
          )}
        </div>

        {(actionError || writeError) && (
          <p className="status status-error">
            {actionError ?? writeError?.message}
          </p>
        )}
      </div>
    </div>
  );
}
