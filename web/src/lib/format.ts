import { formatEther, parseEther } from "viem";

export function monToWei(value: string): bigint {
  return parseEther(value || "0");
}

export function weiToMon(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return "—";
  const n = Number(formatEther(value));
  if (!Number.isFinite(n)) return formatEther(value);
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function shortAddress(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDeadline(ts: bigint | number) {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function progressPct(raised: bigint, target: bigint): number {
  if (target === 0n) return 0;
  const pct = Number((raised * 10000n) / target) / 100;
  return Math.min(100, Math.max(0, pct));
}
