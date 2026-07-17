"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";
import {
  crowdCartAbi,
  crowdCartAddress,
  isCrowdCartConfigured,
  loadCartIds,
  parseCartView,
} from "@/lib/contracts";
import { weiToMon } from "@/lib/format";

export default function MinePage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(loadCartIds());
  }, []);

  const { data, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: crowdCartAddress,
      abi: crowdCartAbi,
      functionName: "getCart" as const,
      args: [BigInt(id)] as const,
    })),
    query: {
      enabled: ids.length > 0 && isCrowdCartConfigured(),
    },
  });

  return (
    <div className="workbench">
      <div className="panel">
        <h1 className="panel-title">My carts</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Carts you created or opened on this device. Share a cart link to keep
          it in this list.
        </p>

        {ids.length === 0 && (
          <p className="status">
            No carts yet.{" "}
            <Link href="/create">Create one</Link> to get started.
          </p>
        )}

        {isLoading && ids.length > 0 && <p className="muted">Loading…</p>}

        <ul className="cart-list">
          {ids.map((id, i) => {
            const result = data?.[i];
            const cart =
              result?.status === "success"
                ? parseCartView(result.result)
                : null;
            return (
              <li key={id}>
                <Link href={`/cart/${id}`}>
                  <strong>{cart?.title ?? `Cart #${id}`}</strong>
                  <br />
                  <span className="mono-label">
                    #{id}
                    {cart
                      ? ` · ${weiToMon(cart.raised)} / ${weiToMon(cart.target)} MON`
                      : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
