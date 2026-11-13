import { Link } from "@tanstack/react-router";
import { ArrowRight, CloudSun, Coffee, Globe2, TrendingUp } from "lucide-react";
import { CoffeePhoto } from "@/components/coffee-photo";
import { MaturityBadge } from "@/components/kit";
import { Section } from "@/components/shell";
import { Button } from "@/components/ui/button";
import "./landing.css";

const drivers = [
  {
    icon: Coffee,
    title: "Everyday demand",
    text: "An agricultural commodity woven into daily routines, from local cafés to global consumption.",
  },
  {
    icon: CloudSun,
    title: "Climate & harvests",
    text: "Growing regions, weather and harvest cycles shape availability, quality and producers’ livelihoods.",
  },
  {
    icon: Globe2,
    title: "Global trade & logistics",
    text: "Coffee crosses borders. Freight, currency, trade conditions and operating costs all matter.",
  },
  {
    icon: TrendingUp,
    title: "Commodity price volatility",
    text: "Supply and demand move prices. A familiar daily ritual still carries real market risk.",
  },
];

const journey = [
  ["Grow", "Physical coffee starts with producers, growing regions and harvests."],
  ["Verify", "Origin, quality and custody would need independent, verifiable evidence."],
  ["Tokenize", "A proposed asset protocol would represent verified coffee lots digitally."],
  ["Trade", "Digital assets could connect to swaps, liquidity and financial markets."],
  ["Redeem", "Real settlement would require custody, delivery and redemption integrations."],
];

const products = [
  {
    title: "Coffee Perpetuals",
    to: "/app/perps",
    note: "Arabica / Robusta / Gesha",
    text: "Three test markets with operator-controlled synthetic Testnet price references, not live coffee exchange quotations. Test USDC has no monetary value.",
  },
  {
    title: "RHEA Coffee Swap",
    to: "/app/swap",
    note: "Test tokens / on-chain swaps",
    text: "Actual NEAR Testnet swap mechanics through RHEA pools, subject to test liquidity. Non-monetary test tokens, not a sale of physical coffee.",
  },
  {
    title: "OutLayer Oracle",
    to: "/app/oracle",
    note: "Read-only / independent monitoring",
    text: "Read-only monitoring of historical benchmark and demonstration data. Independent and separate from Perpetuals: it is not its execution-price feed or a live coffee spot price.",
  },
] as const;

const demos = [
  ["Marketplace", "/market", "Sample listings, not verified stock or live coffee orders."],
  [
    "Coffee Assets",
    "/app/assets",
    "Illustrative lots, not verified inventory or physical backing.",
  ],
  [
    "Coffee Passport",
    "/app/coffee-passport",
    "Example provenance records, not certification or custody evidence.",
  ],
  ["Roasting Lab", "/app/roast", "Simulated conversion, not physical coffee processing."],
  ["Redeem", "/app/redeem", "A demo flow, not physical redemption or delivery."],
] as const;

const roadmap = [
  {
    title: "Testnet foundation",
    status: "Implemented · NEAR Testnet",
    text: "Perpetuals, RHEA swaps and separate read-only OutLayer monitoring. Demonstrations use test tokens and synthetic or benchmark data.",
  },
  {
    title: "Asset protocol verification",
    status: "In development · conceptual design",
    text: "Define and validate GCT/RCT asset, backing, provenance and conversion rules. Current asset screens remain illustrative demos.",
  },
  {
    title: "Physical integrations",
    status: "Future · planned",
    text: "Connect producers, cooperatives, roasters and custody providers, with independent verification of origin and inventory.",
  },
  {
    title: "Real redemption & settlement",
    status: "Future · planned",
    text: "Establish the legal, operational and delivery processes needed to settle digital claims in physical coffee.",
  },
  {
    title: "Liquidity & capital formation",
    status: "Future · planned",
    text: "Explore liquidity, staking and yield, treasury tools and venture capital for the coffee economy. No returns are promised.",
  },
  {
    title: "Multichain expansion",
    status: "Future · planned",
    text: "Extend the financial layer to additional networks only as the asset protocol and its integrations mature.",
  },
];

function LandingActions() {
  return (
    <div className="landing-actions">
      <Button
        size="lg"
        asChild
        className="bg-hero-action text-hero-action-foreground hover:bg-hero-action-hover"
      >
        <Link to="/app/perps">
          Explore the ecosystem <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        asChild
        className="border-hero-foreground/60 bg-transparent text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
      >
        <Link to="/app/docs">Read the documentation</Link>
      </Button>
    </div>
  );
}

/** Public positioning only; operational capabilities remain in their existing app routes. */
export function LandingPage() {
  return (
    <div className="landing">
      <section className="brand-hero landing-hero">
        <Section className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-kicker text-hero-highlight">
              REAL-WORLD COMMODITY · ON-CHAIN FINANCE
            </p>
            <h1>
              Coffee is more than a commodity. <em>It’s a global market.</em>
            </h1>
            <p className="landing-hero-intro text-hero-muted">
              A new financial layer for the real coffee economy. Connecting physical coffee, digital
              assets and decentralized markets.
            </p>
            <LandingActions />
            <p className="landing-maturity text-hero-muted">
              Financial products currently demonstrated on NEAR Testnet. Test tokens only; no
              monetary value. Physical coffee integrations are not live.
            </p>
          </div>
          <CoffeePhoto
            photo="harvest"
            priority
            sizes="(min-width: 1280px) 530px, (min-width: 1024px) 42vw, calc(100vw - 2rem)"
            className="landing-hero-photo [&_figcaption]:text-hero-muted"
          />
        </Section>
        <Section className="landing-hero-foot">
          <p>The financial infrastructure for the real coffee economy.</p>
          <a href="#why-coffee">
            Rooted in the real world <span aria-hidden="true">↓</span>
          </a>
        </Section>
      </section>

      <section id="why-coffee" className="landing-section">
        <Section>
          <div className="landing-editorial-grid">
            <div>
              <p className="brand-eyebrow">01 / Why coffee</p>
              <h2>
                An essential commodity. <em>A complex global market.</em>
              </h2>
            </div>
            <div className="landing-prose">
              <p>
                Before it is an asset, coffee is a crop. Grown, harvested, shipped and roasted, it
                connects producers and everyday consumers through a globally traded market.
              </p>
              <p>
                Everyday consumption may give demand resilient characteristics. That makes coffee a
                resilient real-world market to build infrastructure around — not a crisis-proof
                asset, a guaranteed hedge or a promise of rising prices.
              </p>
              <p>
                Producers and prices remain exposed to weather, supply shocks, operating costs,
                currency, trade and volatility. Financial infrastructure must make those risks
                legible, not wish them away.
              </p>
            </div>
          </div>
          <ul className="landing-drivers" role="list">
            {drivers.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon className="size-5 text-highlight" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </Section>
      </section>

      <section id="coffee-to-markets" className="landing-section landing-tinted">
        <Section>
          <div className="landing-section-head">
            <p className="brand-eyebrow">
              02 / Physical coffee → digital assets → financial markets
            </p>
            <h2>
              From the ground <em>to a global market.</em>
            </h2>
            <p className="landing-lede">
              The intended value chain, not a live supply chain. Physical sourcing, custody,
              independent verification and delivery/redemption are future integrations.
            </p>
          </div>
          <ol className="landing-journey" role="list">
            {journey.map(([title, text], i) => (
              <li key={title}>
                <span className="landing-step" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="landing-small mt-8">
            Today’s Testnet markets demonstrate financial mechanics, not ownership of verified
            coffee. No physical backing, independent certification or real redemption is claimed.
          </p>
        </Section>
      </section>

      <section id="ecosystem-layers" className="landing-section">
        <Section className="landing-layer-grid">
          <div>
            <p className="brand-eyebrow">03 / The architecture</p>
            <h2>
              One economy. <em>Three connected layers.</em>
            </h2>
            <p className="landing-lede">
              Coffee is the source of economic value. Digital assets are its representation layer.
              Decentralized markets are the financial layer.
            </p>
            <CoffeePhoto
              photo="cherries"
              className="mt-8"
              sizes="(min-width: 1280px) 470px, (min-width: 1024px) 36vw, calc(100vw - 2rem)"
            />
          </div>
          <div className="landing-layers">
            <article>
              <p className="brand-eyebrow">Layer 01</p>
              <h3>Real Coffee Economy</h3>
              <MaturityBadge variant="preview">Vision · physical integrations needed</MaturityBadge>
              <p>
                Producers, cooperatives and roasters. Physical inventory, origin, custody and
                delivery. The economic foundation we intend to connect — not an operating ROASTAKE
                supply network today.
              </p>
            </article>
            <article>
              <p className="brand-eyebrow">Layer 02</p>
              <h3>Coffee Asset Protocol</h3>
              <MaturityBadge variant="preview">Conceptual / In development</MaturityBadge>
              <p>
                Green Coffee Token (GCT) and Roasted Coffee Token (RCT): a proposed model for
                provenance, conversion and redemption. The design proposes 1 token = 1 kg; it is not
                a verified, physically backed asset currently redeemable for coffee.
              </p>
              <p>
                The proposed 1:0.9 green-to-roasted conversion is a design model to validate, not an
                already operating physical process or a guaranteed roasting yield.
              </p>
            </article>
            <article>
              <p className="brand-eyebrow">Layer 03</p>
              <h3>Coffee Financial Layer</h3>
              <MaturityBadge variant="testnet">Live on NEAR Testnet</MaturityBadge>
              <p>
                Perpetuals and RHEA swaps demonstrate financial mechanics. OutLayer provides
                separate read-only oracle monitoring, not Perpetuals execution prices. A Testnet
                price is not a real coffee spot price.
              </p>
              <p>
                <strong>Planned:</strong> liquidity, staking/yield, treasury tools and venture
                capital. Current previews do not provide these financial services.
              </p>
            </article>
          </div>
        </Section>
      </section>

      <section id="explore" className="landing-section landing-tinted">
        <Section>
          <div className="landing-section-head">
            <p className="brand-eyebrow">04 / Explore ROASTAKE</p>
            <h2>Explore the ecosystem.</h2>
            <p className="landing-lede">
              Start with what exists. See clearly what is still being imagined.
            </p>
          </div>
          <div className="landing-products">
            {products.map((product, i) => (
              <article key={product.to}>
                <p className="landing-product-index" aria-hidden="true">
                  0{i + 1}
                </p>
                <div>
                  <p className="brand-eyebrow">{product.note}</p>
                  <h3>
                    <Link to={product.to}>
                      {product.title} <ArrowRight aria-hidden="true" />
                    </Link>
                  </h3>
                  <p>{product.text}</p>
                </div>
                <MaturityBadge variant="testnet">Live on NEAR Testnet</MaturityBadge>
              </article>
            ))}
          </div>
          <div className="landing-demo-head">
            <h3>The physical-coffee experience, illustrated.</h3>
            <MaturityBadge variant="demo">Demo / Illustrative</MaturityBadge>
          </div>
          <p className="landing-small max-w-3xl">
            These local demo surfaces explore the vision. None verifies inventory, custody,
            certification, physical processing or delivery; no real coffee orders are accepted.
          </p>
          <ul className="landing-demos" role="list">
            {demos.map(([title, to, text]) => (
              <li key={to}>
                <Link to={to}>
                  {title} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </Section>
      </section>

      <section id="why-roastake" className="landing-section">
        <Section className="landing-principles-grid">
          <div>
            <p className="brand-eyebrow">05 / Why ROASTAKE</p>
            <h2>
              Built around coffee. <em>Not the other way around.</em>
            </h2>
            <p className="landing-lede">Three principles for what we build next.</p>
          </div>
          <dl className="landing-principles">
            <div>
              <dt>Real-world first</dt>
              <dd>
                Coffee is the economic foundation, not a theme. The goal is infrastructure that
                serves the people and assets behind the market.
              </dd>
            </div>
            <div>
              <dt>Financially connected</dt>
              <dd>
                Assets, markets and DeFi can open new participation models. Connecting them
                responsibly requires more than a token.
              </dd>
            </div>
            <div>
              <dt>Transparency by design</dt>
              <dd>
                Origin, backing, custody, data source and product status should be explicit. These
                are design commitments, not claims that physical verification is operational.
              </dd>
            </div>
          </dl>
        </Section>
      </section>

      <section id="roadmap" className="landing-section landing-tinted">
        <Section>
          <div className="landing-editorial-grid">
            <div>
              <p className="brand-eyebrow">06 / The road ahead</p>
              <h2>
                A foundation, then <em>the full value chain.</em>
              </h2>
            </div>
            <div className="landing-prose">
              <p>
                A staged direction, not a delivery promise. Physical integrations, real settlement
                and expanded financial services still require verification and development. No dates
                or partnerships are implied.
              </p>
              <Link to="/roadmap" className="landing-text-link">
                Explore the roadmap <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ol className="landing-roadmap" role="list">
            {roadmap.map(({ title, status, text }, i) => (
              <li key={title}>
                <span className="landing-step" aria-hidden="true">
                  0{i + 1}
                </span>
                <div>
                  <p className="brand-eyebrow">{status}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </section>

      <section className="brand-hero landing-closing">
        <Section>
          <p className="landing-kicker text-hero-highlight">
            Rooted in coffee. Built for what comes next.
          </p>
          <h2>
            The future of coffee <em>is more than a cup.</em>
          </h2>
          <p className="text-hero-muted">
            It is a global economy. Let’s build its next financial layer.
          </p>
          <LandingActions />
          <p className="landing-maturity text-hero-muted">
            Explore the NEAR Testnet foundation. Read the vision and its limitations.
          </p>
        </Section>
      </section>
    </div>
  );
}
