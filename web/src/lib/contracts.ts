import { type Abi, type Address, type Hex, getAddress, isAddress, isHex } from "viem";
import CrowdCartAbiJson from "./abi/CrowdCart.json";

export const crowdCartAbi = CrowdCartAbiJson as Abi;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export type CartId = Hex;

export type CartView = {
  organizer: Address;
  target: bigint;
  deadline: bigint;
  raised: bigint;
  withdrawn: boolean;
  refundsOpen: boolean;
  title: string;
};

/** Parse a URL/param cart id into bytes32 hex. */
export function parseCartId(raw: string): CartId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withPrefix = (
    trimmed.startsWith("0x") || trimmed.startsWith("0X")
      ? trimmed
      : `0x${trimmed}`
  ) as Hex;
  if (!isHex(withPrefix) || withPrefix.length !== 66) return null;
  return withPrefix.toLowerCase() as CartId;
}

/** Short path segment for share links (64 hex chars, no 0x). */
export function cartIdToPath(id: CartId | string): string {
  const s = String(id);
  return s.startsWith("0x") || s.startsWith("0X")
    ? s.slice(2).toLowerCase()
    : s.toLowerCase();
}

export function shortCartId(id: string): string {
  const hex = cartIdToPath(id);
  if (hex.length < 12) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

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

export const LOCAL_CART_IDS_KEY = "crowdcart:ids:v2";

export function rememberCartId(id: string | CartId) {
  if (typeof window === "undefined") return;
  const parsed = parseCartId(String(id));
  if (!parsed) return;
  const key = cartIdToPath(parsed);
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
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(String)
      .map((id) => parseCartId(id))
      .filter((id): id is CartId => id !== null)
      .map(cartIdToPath);
  } catch {
    return [];
  }
}
