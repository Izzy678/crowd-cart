import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        Crowd<span className="wordmark-mark">C</span>art
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/create">Create</Link>
        <Link href="/mine">My carts</Link>
      </nav>
      <ConnectButton />
    </header>
  );
}
