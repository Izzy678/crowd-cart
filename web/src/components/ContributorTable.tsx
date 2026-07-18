"use client";

import { useEffect, useMemo } from "react";
import { type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  crowdCartAbi,
  crowdCartAddress,
  isCrowdCartConfigured,
  type CartId,
} from "@/lib/contracts";
import { shortAddress, weiToMon } from "@/lib/format";

type Props = {
  cartId: CartId;
  organizer: Address;
  raised: bigint;
  withdrawRequested: boolean;
  connectedAddress?: Address;
  refreshKey?: number;
};

export function ContributorTable({
  cartId,
  organizer,
  raised,
  withdrawRequested,
  connectedAddress,
  refreshKey = 0,
}: Props) {
  const {
    data: contributors,
    isLoading: loadingList,
    refetch: refetchList,
  } = useReadContract({
    address: crowdCartAddress,
    abi: crowdCartAbi,
    functionName: "getContributors",
    args: [cartId],
    query: { enabled: isCrowdCartConfigured() },
  });

  const list = (contributors as Address[] | undefined) ?? [];

  const detailContracts = useMemo(
    () =>
      list.flatMap((contributor) => [
        {
          address: crowdCartAddress,
          abi: crowdCartAbi,
          functionName: "contributionOf" as const,
          args: [cartId, contributor] as const,
        },
        {
          address: crowdCartAddress,
          abi: crowdCartAbi,
          functionName: "hasApprovedWithdraw" as const,
          args: [cartId, contributor] as const,
        },
      ]),
    [list, cartId],
  );

  const {
    data: details,
    isLoading: loadingDetails,
    refetch: refetchDetails,
  } = useReadContracts({
    contracts: detailContracts,
    query: {
      enabled: list.length > 0 && isCrowdCartConfigured(),
    },
  });

  useEffect(() => {
    if (refreshKey === 0) return;
    void refetchList();
    void refetchDetails();
  }, [refreshKey, refetchList, refetchDetails]);

  const rows = list.map((contributor, i) => {
    const amountResult = details?.[i * 2];
    const approvedResult = details?.[i * 2 + 1];
    const amount =
      amountResult?.status === "success"
        ? (amountResult.result as bigint)
        : 0n;
    const approved =
      approvedResult?.status === "success"
        ? Boolean(approvedResult.result)
        : false;
    const share =
      raised > 0n ? Number((amount * 10000n) / raised) / 100 : 0;
    const isYou =
      !!connectedAddress &&
      contributor.toLowerCase() === connectedAddress.toLowerCase();
    const isOrg = contributor.toLowerCase() === organizer.toLowerCase();

    return { contributor, amount, approved, share, isYou, isOrg };
  });

  const loading = loadingList || (list.length > 0 && loadingDetails);

  return (
    <div className="panel">
      <h2 className="panel-title" style={{ fontSize: "1.2rem" }}>
        Contributors
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Everyone who put MON in this cart. Approvals only count unique wallets.
      </p>

      {loading && <p className="muted">Loading contributors…</p>}

      {!loading && rows.length === 0 && (
        <p className="muted">No contributions yet. Be the first.</p>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="contrib-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Share</th>
                <th>Withdraw</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.contributor}>
                  <td>
                    <span className="mono-label">
                      {shortAddress(row.contributor)}
                    </span>
                    {row.isYou && <span className="tag">you</span>}
                    {row.isOrg && <span className="tag tag-org">organizer</span>}
                  </td>
                  <td>{weiToMon(row.amount)} MON</td>
                  <td>{row.share.toFixed(1)}%</td>
                  <td>
                    {!withdrawRequested
                      ? "—"
                      : row.approved
                        ? "Approved"
                        : "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
