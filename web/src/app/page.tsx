import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <div className="page hero">
        <p className="hero-kicker">Group buys on Monad Testnet</p>
        <h1>Stop chasing friends for their share.</h1>
        <p className="hero-lede">
          Open a cart, set a target and deadline, share the link. If you hit the
          goal, the organizer takes the pot. If not, everyone gets their MON
          back.
        </p>
        <div className="hero-cta">
          <Link href="/create" className="btn btn--pear btn--lg">
            Start a cart
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/mine" className="btn btn--outline btn--lg">
            My carts
          </Link>
        </div>
      </div>

      <section className="stage band-pear">
        <div className="stage-inner">
          <p className="stage-num">1.0 · Create</p>
          <h2>Name the buy. Set the target.</h2>
          <p>
            Pick what you&apos;re pooling for — a vacuum, tickets, a weekend
            trip kit — and lock a MON amount plus a deadline onchain.
          </p>
        </div>
      </section>

      <section className="stage band-cyan">
        <div className="stage-inner">
          <p className="stage-num">2.0 · Share</p>
          <h2>Send one link. Skip the spreadsheet.</h2>
          <p>
            Every cart has a shareable page. Friends connect a wallet and drop
            in their share — no group chat IOUs.
          </p>
        </div>
      </section>

      <section className="stage">
        <div className="stage-inner">
          <p className="stage-num">3.0 · Contribute</p>
          <h2>Watch the pot fill in real time.</h2>
          <p>
            Progress, deadline, and each contribution live on Monad Testnet —
            not a fake dashboard of placeholder numbers.
          </p>
        </div>
      </section>

      <section className="stage band-coral">
        <div className="stage-inner">
          <p className="stage-num">4.0 · Settle</p>
          <h2>Funded? Organizer withdraws. Missed? Claim refunds.</h2>
          <p>
            Hit the target and the organizer pulls the full pot. Miss the
            deadline underfunded and contributors reclaim what they put in.
          </p>
          <p style={{ marginTop: "1.25rem" }}>
            <Link href="/create" className="btn btn--coral">
              Start at stage 1
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
