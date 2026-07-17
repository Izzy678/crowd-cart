import { type Abi, type Address, getAddress, isAddress } from "viem";
import CrowdCartAbiJson from "./abi/CrowdCart.json";

export const crowdCartAbi = CrowdCartAbiJson as Abi;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export type CartView = {
  organizer: Address;
  target: bigint;
  deadline: bigint;
  raised: bigint;
  withdrawn: boolean;
  refundsOpen: boolean;
  title: string;
};

/** Normalize viem struct result (object or tuple) into CartView. */
export function parseCartView(data: unknown): CartView | null {
  if (!data) return null;

  if (Array.isArray(data) && data.length >= 7) {
    return {
      organizer: data[0] as Address,
      target: data[1] as bigint,
      deadline: data[2] as bigint,
      raised: data[3] as bigint,
      withdrawn: Boolean(data[4]),
      refundsOpen: Boolean(data[5]),
      title: String(data[6]),
    };
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (
      typeof o.organizer === "string" &&
      typeof o.target === "bigint" &&
      typeof o.deadline === "bigint" &&
      typeof o.raised === "bigint"
    ) {
      return {
        organizer: o.organizer as Address,
        target: o.target,
        deadline: o.deadline,
        raised: o.raised,
        withdrawn: Boolean(o.withdrawn),
        refundsOpen: Boolean(o.refundsOpen),
        title: String(o.title ?? ""),
      };
    }
  }

  return null;
}

function resolveCrowdCartAddress(): Address {
  const raw = (process.env.NEXT_PUBLIC_CROWDCART_ADDRESS ?? "").trim();
  if (!raw) return ZERO;

  const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
  if (hex.length !== 40 || !isAddress(`0x${hex}`)) {
    console.error(
      "[CrowdCart] NEXT_PUBLIC_CROWDCART_ADDRESS must be a contract address (0x + 40 hex chars), not a private key.",
    );
    return ZERO;
  }

  try {
    return getAddress(`0x${hex}`);
  } catch {
    return ZERO;
  }
}

export const crowdCartAddress = resolveCrowdCartAddress();

export function isCrowdCartConfigured() {
  return crowdCartAddress !== ZERO;
}

export const LOCAL_CART_IDS_KEY = "crowdcart:ids";

export function rememberCartId(id: string | number | bigint) {
  if (typeof window === "undefined") return;
  const key = String(id);
  const existing = loadCartIds();
  if (!existing.includes(key)) {
    localStorage.setItem(
      LOCAL_CART_IDS_KEY,
      JSON.stringify([key, ...existing].slice(0, 50)),
    );
  }
}

export function loadCartIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CART_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
