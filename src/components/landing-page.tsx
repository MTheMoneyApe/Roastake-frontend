import { Link } from "@tanstack/react-router";
import { ArrowRight, CloudSun, Coffee, Globe2, TrendingUp } from "lucide-react";
import { CoffeePhoto } from "@/components/coffee-photo";
import { useLandingLanguage } from "@/components/landing-language";
import { MaturityBadge } from "@/components/kit";
import { Section } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { SCOPE_LABELS } from "@/lib/navigation";
import "./landing.css";

// Both languages share the same routes, maturity labels and product boundaries.
const copy = {
  en: {
    kicker: "ROASTAKE / REAL COFFEE. NEW FINANCIAL POSSIBILITIES.",
    headline: "The financial layer for the",
    emphasis: "global coffee economy.",
    intro:
      "Coffee connects the world. We’re building a bridge from its real economy to digital assets and decentralized markets — starting on NEAR Testnet.",
    primary: "Explore Testnet Markets",
    secondary: "Open the documentation",
    workflowKicker: "A future workflow",
    workflowStatus: "PLANNED · NOT LIVE",
    workflowTitle: "From harvest to a clearer price agreement.",
    workflowLead:
      "A producer in Huila could agree a visible price and delivery terms with a roaster before harvest. The producer gets a clearer commercial reference; the roaster can plan purchase costs before the crop ships. This producer-to-roaster forward-contract workflow is a future goal—not a live ROASTAKE service.",
    workflowPrototype:
      "The current NEAR Testnet prototype validates parts of the market infrastructure. Prices are synthetic and operator-controlled; verified inventory, forward-contract execution and commercial settlement are not live.",
    workflowSteps: [
      [
        "Propose a coffee lot",
        "A producer submits origin, expected harvest, quality and volume for review. These details are not independently verified today.",
      ],
      [
        "Agree on price and terms",
        "Producer and roaster agree a visible reference price, volume, grade and delivery window.",
      ],
      [
        "Record a forward contract",
        "The planned on-chain workflow records the agreed terms and obligations. Forward-contract creation and execution are not live.",
      ],
      [
        "Verify the lot and test settlement",
        "The pilot would test coffee-lot verification and end-to-end settlement on NEAR Testnet—before any real-world delivery or commercial claim.",
      ],
    ],
    pilotKicker: "Pilot target · 2027",
    pilotTitle: "Test the workflow with three producers and two roasters.",
    pilotNote:
      "NEAR ecosystem support would help build the on-chain forward-contract workflow and verifiable coffee-lot records, then test contract creation, price agreement, lot verification and end-to-end Testnet settlement. Three producers and two roasters are the 2027 target cohort—not confirmed partners or committed participants. Physical delivery and commercial settlement are outside the current prototype.",
    pilotMetrics: [
      ["3", "producers"],
      ["2", "roasters"],
      ["2027", "target year"],
    ],
    foundation: "Rooted in the real world",
    thesisKicker: "The foundation",
    thesisTitle: "Coffee is more than a commodity.",
    thesisLead:
      "It is a daily ritual, a livelihood and a global economy. That real-world foundation comes first.",
    thesis:
      "Everyday consumption may give global demand resilient characteristics. But coffee is not crisis-proof, a guaranteed hedge or an uncorrelated asset. Prices can fall; production and trade remain exposed to real risks.",
    drivers: [
      [
        "Everyday demand",
        "From local cafés to household routines, coffee has enduring uses beyond financial markets.",
      ],
      [
        "Climate & harvests",
        "Weather, growing conditions and harvest cycles affect supply, quality and livelihoods.",
      ],
      [
        "Global supply chains",
        "Producers, roasters and logistics connect across borders, currencies and operating costs.",
      ],
      [
        "Real market risk",
        "Price volatility and supply shocks remain. Resilience is a thesis, never a promise of appreciation.",
      ],
    ],
    layersKicker: "From coffee to capital",
    layersTitle: "One economy. Three layers to connect.",
    layersLead:
      "Physical coffee is the foundation. Digital assets are a proposed representation layer. Markets are the financial layer — not a substitute for the coffee behind them.",
    layers: [
      [
        "Real Coffee Economy",
        "Physical-world foundation · future integrations",
        "Farmers, roasters, supply chains, logistics and market data. Connecting them would require independent evidence of origin, quality, custody and inventory. ROASTAKE has no integrated or verified physical supply network today.",
      ],
      [
        "Coffee Asset Economy",
        "Conceptual / In development",
        "Green Coffee Token (GCT) and Roasted Coffee Token (RCT) are conceptual digital representations. 1 token = 1 kg is a proposed accounting model, not a currently backed, custodied, physically verified or redeemable asset.",
        "Roasting loses mass: green input and roasted output are not 1:1. Yield, loss and fees must be accounted for separately; the demo does not process physical coffee.",
      ],
      [
        "Financial Layer",
        "Live on NEAR Testnet",
        "Perpetuals use operator-controlled synthetic reference prices, not real coffee spot quotes. RHEA Mini Swap executes NEAR Testnet transactions through pools; it does not represent purchases of physical coffee.",
        "OutLayer is a separate, read-only benchmark/oracle demo. It does not power Perps or verify physical coffee.",
      ],
    ],
    exploreKicker: "Product, with context",
    exploreTitle: "What you can explore today.",
    exploreLead:
      "Explore the Testnet infrastructure available today, then see the illustrative coffee experience and longer-term vision.",
    products: [
      [
        "Coffee Perpetuals",
        "Synthetic markets / test USDC",
        "Operator-controlled synthetic Testnet price references, not live coffee exchange quotations.",
      ],
      [
        "RHEA Mini Swap",
        "Test tokens / on-chain pools",
        "Actual NEAR Testnet swaps, subject to pool liquidity and wallet availability; not physical coffee transactions.",
      ],
      [
        "OutLayer Oracle",
        "Independent / read-only",
        "Separate benchmark and oracle monitoring. Does not power Perps, provide its execution prices or verify coffee, custody or backing.",
      ],
    ],
    demoTitle: "The coffee experience, illustrated.",
    demoNote:
      "Browser-only examples. No verified inventory, backing, custody, certification, payments, physical processing or shipments.",
    demos: [
      ["Marketplace", "Sample listings and simulated orders; not verified stock."],
      ["Coffee Assets", "Illustrative lots and proposed GCT/RCT accounting."],
      ["Coffee Passport", "Example provenance, not independent certification."],
      ["Roasting Lab", "Simulated conversion, not physical processing."],
      ["Redeem", "Demo reservation flow, not a shipment or real redemption."],
    ],
    plannedTitle: "An ecosystem still to build.",
    plannedNote:
      "Vaults, staking, lending, governance and other modules are design previews only, not operational financial services.",
    roadmapLink: "Explore the Roadmap",
    capitalKicker: "Future direction",
    capitalTitle: "Coffee + DeFi + Venture Capital.",
    capitalLead:
      "Capital should connect to the people and infrastructure that make the coffee economy work.",
    capitalText:
      "Our longer-term vision brings producers, digital markets and coffee ventures into a connected ecosystem: financing infrastructure, supporting new businesses and exploring responsible liquidity models. Physical verification, legal frameworks and operating partners would need to come first.",
    capitalNote:
      "Roadmap only. No live investment product, managed fund, staking yield or promised return is offered.",
    roadmapKicker: "Build with clarity",
    roadmapTitle: "Understand today. Shape what comes next.",
    roadmapText:
      "The Testnet foundation is available to explore. Physical integrations, asset backing and real settlement remain future work. The 2027 pilot is a target, not a confirmed launch or delivery promise.",
    docsTitle: "Read before you connect.",
    docsText:
      "Understand the architecture, product status, data sources and limits before exploring the app.",
    closing: "Real coffee. Clear boundaries. A new financial direction.",
    photoCaption: "Editorial photography · not evidence of a ROASTAKE supplier or verified lot",
    harvestAlt: "A coffee grower holding a bucket of harvested cherries",
    cherriesAlt: "Red coffee cherries ripening among green leaves",
  },
  es: {
    kicker: "ROASTAKE / CAFÉ REAL. NUEVAS POSIBILIDADES FINANCIERAS.",
    headline: "La capa financiera para la",
    emphasis: "economía global del café.",
    intro:
      "El café conecta al mundo. Construimos un puente entre su economía real, los activos digitales y los mercados descentralizados — empezando en NEAR Testnet.",
    primary: "Explorar mercados Testnet",
    secondary: "Abrir documentación",
    workflowKicker: "Un flujo de trabajo futuro",
    workflowStatus: "PLANIFICADO · NO ACTIVO",
    workflowTitle: "De la cosecha a un precio acordado.",
    workflowLead:
      "Un productor de Huila podría acordar con un tostador un precio visible y las condiciones de entrega antes de la cosecha. El productor tendría una referencia comercial más clara; el tostador podría planificar el coste de compra antes del envío. Este flujo de contratos a plazo entre productores y tostadores es un objetivo futuro, no un servicio activo de ROASTAKE.",
    workflowPrototype:
      "El prototipo actual en NEAR Testnet valida partes de la infraestructura de mercado. Los precios son sintéticos y controlados por un operador; el inventario verificado, la ejecución de contratos a plazo y la liquidación comercial no están activos.",
    workflowSteps: [
      [
        "Proponer un lote de café",
        "El productor presenta el origen, la cosecha estimada, la calidad y el volumen para su revisión. Hoy estos datos no cuentan con verificación independiente.",
      ],
      [
        "Acordar precio y condiciones",
        "Productor y tostador acuerdan un precio de referencia visible, volumen, calidad y ventana de entrega.",
      ],
      [
        "Registrar un contrato a plazo",
        "El flujo on-chain previsto registraría las condiciones y obligaciones acordadas. La creación y ejecución del contrato aún no están activas.",
      ],
      [
        "Verificar el lote y probar la liquidación",
        "El piloto probaría la verificación del lote y la liquidación integral en NEAR Testnet, antes de cualquier entrega física o afirmación comercial.",
      ],
    ],
    pilotKicker: "Objetivo del piloto · 2027",
    pilotTitle: "Probar el flujo con tres productores y dos tostadores.",
    pilotNote:
      "El apoyo del ecosistema NEAR permitiría construir el flujo on-chain de contratos a plazo y los registros verificables de lotes de café, y después probar la creación de contratos, el acuerdo de precio, la verificación de lotes y la liquidación integral en Testnet. Tres productores y dos tostadores son el objetivo para 2027, no socios ni participantes confirmados. La entrega física y la liquidación comercial quedan fuera del prototipo actual.",
    pilotMetrics: [
      ["3", "productores"],
      ["2", "tostadores"],
      ["2027", "año objetivo"],
    ],
    foundation: "Con raíces en el mundo real",
    thesisKicker: "El fundamento",
    thesisTitle: "El café es más que una materia prima.",
    thesisLead:
      "Es un ritual diario, un medio de vida y una economía global. Esa base real es lo primero.",
    thesis:
      "El consumo cotidiano puede dar resiliencia a la demanda global. Pero el café no es inmune a las crisis, una cobertura garantizada ni un activo descorrelacionado. Los precios pueden caer; la producción y el comercio siguen expuestos a riesgos reales.",
    drivers: [
      [
        "Demanda cotidiana",
        "De las cafeterías a los hogares, el café tiene usos duraderos más allá de los mercados financieros.",
      ],
      [
        "Clima y cosechas",
        "El tiempo, las condiciones de cultivo y los ciclos de cosecha afectan la oferta, la calidad y los medios de vida.",
      ],
      [
        "Cadenas globales",
        "Productores, tostadores y logística se conectan entre fronteras, monedas y costes operativos.",
      ],
      [
        "Riesgo de mercado real",
        "La volatilidad y las disrupciones de oferta persisten. La resiliencia es una tesis, nunca una promesa de revalorización.",
      ],
    ],
    layersKicker: "Del café al capital",
    layersTitle: "Una economía. Tres capas por conectar.",
    layersLead:
      "El café físico es el fundamento. Los activos digitales son una capa de representación propuesta. Los mercados son la capa financiera, no un sustituto del café que habría detrás.",
    layers: [
      [
        "Economía real del café",
        "Base física · integraciones futuras",
        "Agricultores, tostadores, cadenas de suministro, logística y datos de mercado. Conectarlos requeriría pruebas independientes de origen, calidad, custodia e inventario. ROASTAKE no tiene hoy una red física integrada ni verificada.",
      ],
      [
        "Economía de activos de café",
        "Conceptual / En desarrollo",
        "Green Coffee Token (GCT) y Roasted Coffee Token (RCT) son representaciones digitales conceptuales. 1 token = 1 kg es un modelo contable propuesto, no un activo actualmente respaldado, custodiado, verificado físicamente o canjeable.",
        "El tueste pierde masa: la entrada verde y la salida tostada no son 1:1. Rendimiento, merma y comisiones deben contabilizarse por separado; la demo no procesa café físico.",
      ],
      [
        "Capa financiera",
        "Live on NEAR Testnet",
        "Los perpetuos usan referencias de precios sintéticas controladas por un operador, no cotizaciones spot reales de café. RHEA Mini Swap ejecuta transacciones Testnet mediante pools con tokens de prueba sin valor monetario, no compras de café físico.",
        "OutLayer es una demo independiente de referencia/oráculo de solo lectura. No alimenta Perps ni verifica café físico.",
      ],
    ],
    exploreKicker: "Producto, con contexto",
    exploreTitle: "Lo que puedes explorar hoy.",
    exploreLead:
      "Explora la infraestructura disponible hoy en Testnet y después la experiencia ilustrativa del café y la visión a largo plazo.",
    products: [
      [
        "Coffee Perpetuals",
        "Mercados sintéticos / USDC de prueba",
        "Referencias sintéticas Testnet controladas por un operador, no cotizaciones reales de bolsas de café.",
      ],
      [
        "RHEA Mini Swap",
        "Tokens de prueba / pools on-chain",
        "Swaps reales en NEAR Testnet, sujetos a la liquidez del pool y la disponibilidad de la wallet; no son transacciones de café físico.",
      ],
      [
        "OutLayer Oracle",
        "Independiente / solo lectura",
        "Monitorización independiente de referencias y oráculo. No alimenta Perps, no proporciona sus precios de ejecución ni verifica café, custodia o respaldo.",
      ],
    ],
    demoTitle: "La experiencia del café, ilustrada.",
    demoNote:
      "Ejemplos solo en el navegador. Sin inventario, respaldo, custodia, certificación, pagos, procesamiento físico o envíos verificados.",
    demos: [
      ["Marketplace", "Anuncios de ejemplo y pedidos simulados; no existencias verificadas."],
      ["Coffee Assets", "Lotes ilustrativos y contabilidad GCT/RCT propuesta."],
      ["Coffee Passport", "Procedencia de ejemplo, no certificación independiente."],
      ["Roasting Lab", "Conversión simulada, no procesamiento físico."],
      ["Redeem", "Reserva demo, no un envío ni un canje real."],
    ],
    plannedTitle: "Un ecosistema por construir.",
    plannedNote:
      "Vaults, staking, préstamos, gobernanza y otros módulos son solo vistas de diseño, no servicios financieros operativos.",
    roadmapLink: "Explorar la hoja de ruta",
    capitalKicker: "Dirección futura",
    capitalTitle: "Café + DeFi + Venture Capital.",
    capitalLead:
      "El capital debería conectar con las personas y la infraestructura que hacen funcionar la economía del café.",
    capitalText:
      "Nuestra visión a largo plazo conecta productores, mercados digitales y proyectos de café: financiar infraestructura, apoyar nuevos negocios y explorar modelos responsables de liquidez. La verificación física, los marcos legales y los socios operativos tendrían que llegar primero.",
    capitalNote:
      "Solo hoja de ruta. No se ofrece un producto de inversión activo, fondo gestionado, rendimiento de staking ni retorno prometido.",
    roadmapKicker: "Construir con claridad",
    roadmapTitle: "Entiende el presente. Da forma al futuro.",
    roadmapText:
      "La base Testnet está disponible para explorar. Las integraciones físicas, el respaldo de activos y la liquidación real siguen siendo trabajo futuro. El piloto de 2027 es un objetivo, no una fecha de lanzamiento confirmada ni una promesa de entrega.",
    docsTitle: "Lee antes de conectar.",
    docsText:
      "Conoce la arquitectura, el estado del producto, las fuentes de datos y los límites antes de explorar la app.",
    closing: "Café real. Límites claros. Una nueva dirección financiera.",
    photoCaption:
      "Fotografía editorial · no acredita un proveedor de ROASTAKE ni un lote verificado",
    harvestAlt: "Un caficultor sostiene un cubo de cerezas cosechadas",
    cherriesAlt: "Cerezas rojas de café madurando entre hojas verdes",
  },
} as const;

const productRoutes = ["/app/perps", "/app/swap", "/app/oracle"] as const;
const demoRoutes = [
  "/market",
  "/app/assets",
  "/app/coffee-passport",
  "/app/roast",
  "/app/redeem",
] as const;
const driverIcons = [Coffee, CloudSun, Globe2, TrendingUp];

export function LandingPage() {
  const { language } = useLandingLanguage();
  const c = copy[language];
  const actions = (
    <div className="landing-actions">
      <Button
        size="lg"
        asChild
        className="bg-hero-action text-hero-action-foreground hover:bg-hero-action-hover"
      >
        <Link to="/app/perps">
          {c.primary}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
  return (
    <div className="landing" lang={language}>
      <section className="brand-hero landing-hero" aria-labelledby="landing-title">
        <Section className="landing-hero-grid">
          <div className="landing-hero-copy">
            <h1 id="landing-title" className="landing-brand-title text-hero-highlight">{c.kicker}</h1>
            <p className="landing-hero-intro text-hero-muted">{c.headline} {c.emphasis}</p>
            <p className="landing-hero-description text-hero-muted">{c.intro}</p>
            {actions}
          </div>
          <div>
            <CoffeePhoto
              photo="harvest"
              priority
              caption={false}
              alt={c.harvestAlt}
              sizes="(min-width: 1280px) 530px, (min-width: 1024px) 42vw, calc(100vw - 2rem)"
              className="landing-hero-photo"
            />
            <p className="landing-photo-caption text-hero-muted">{c.photoCaption}</p>
          </div>
        </Section>
        <Section className="landing-hero-foot">
          <p>ROASTAKE</p>
          <a href="#why-coffee">
            {c.foundation} <span aria-hidden="true">↓</span>
          </a>
        </Section>
      </section>
      <section
        id="harvest-workflow"
        className="landing-section landing-tinted"
        aria-labelledby="workflow-title"
      >
        <Section>
          <div className="landing-workflow-heading">
            <div>
              <p className="brand-eyebrow">{c.workflowKicker}</p>
              <h2 id="workflow-title">{c.workflowTitle}</h2>
            </div>
            <div className="landing-prose">
              <MaturityBadge variant="preview">
                <span>{c.workflowStatus}</span>
              </MaturityBadge>
              <p className="landing-lead-strong">{c.workflowLead}</p>
              <p className="landing-small">{c.workflowPrototype}</p>
            </div>
          </div>
          <ol className="landing-forward-steps" role="list">
            {c.workflowSteps.map(([title, text], i) => (
              <li key={title}>
                <article>
                  <span className="landing-step-number" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              </li>
            ))}
          </ol>
          <article className="landing-planned landing-pilot">
            <div>
              <p className="brand-eyebrow">{c.pilotKicker}</p>
              <h3>{c.pilotTitle}</h3>
              <p className="landing-small">{c.pilotNote}</p>
            </div>
            <div className="landing-pilot-metrics" aria-label={c.pilotKicker}>
              {c.pilotMetrics.map(([value, label]) => (
                <div className="landing-pilot-metric" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </article>
        </Section>
      </section>
      <section id="why-coffee" className="landing-section" aria-labelledby="thesis-title">
        <Section>
          <div className="landing-editorial-grid">
            <div>
              <p className="brand-eyebrow">{c.thesisKicker}</p>
              <h2 id="thesis-title">{c.thesisTitle}</h2>
            </div>
            <div className="landing-prose">
              <p className="landing-lead-strong">{c.thesisLead}</p>
              <p>{c.thesis}</p>
            </div>
          </div>
          <ul className="landing-drivers" role="list">
            {c.drivers.map(([title, text], i) => {
              const Icon = driverIcons[i];
              return (
                <li key={i}>
                  <Icon className="size-5 text-highlight" aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              );
            })}
          </ul>
        </Section>
      </section>
      <section
        id="ecosystem-layers"
        className="landing-section landing-tinted"
        aria-labelledby="layers-title"
      >
        <Section className="landing-layer-grid">
          <div>
            <p className="brand-eyebrow">{c.layersKicker}</p>
            <h2 id="layers-title">{c.layersTitle}</h2>
            <p className="landing-lede">{c.layersLead}</p>
            <CoffeePhoto
              photo="cherries"
              caption={false}
              alt={c.cherriesAlt}
              className="mt-8"
              sizes="(min-width: 1280px) 470px, (min-width: 1024px) 36vw, calc(100vw - 2rem)"
            />
            <p className="landing-photo-caption text-muted-foreground">{c.photoCaption}</p>
          </div>
          <ol className="landing-layers" role="list">
            {c.layers.map(([title, status, text, note], i) => (
              <li key={i}>
                <article>
                  <p className="brand-eyebrow">
                    {i < 2 ? c.foundation : "NEAR Testnet"}
                  </p>
                  <h3>{title}</h3>
                  <MaturityBadge variant={i === 2 ? "testnet" : "preview"}>
                    <span lang={i === 2 ? "en" : undefined}>{status}</span>
                  </MaturityBadge>
                  <p>{text}</p>
                  {note && <p>{note}</p>}
                </article>
              </li>
            ))}
          </ol>
        </Section>
      </section>
      <section id="explore" className="landing-section" aria-labelledby="explore-title">
        <Section>
          <div className="landing-section-head">
            <p className="brand-eyebrow">{c.exploreKicker}</p>
            <h2 id="explore-title">{c.exploreTitle}</h2>
            <p className="landing-lede">{c.exploreLead}</p>
          </div>
          <div className="landing-products">
            {c.products.map(([title, note, text], i) => (
              <article key={productRoutes[i]}>
                <div>
                  <p className="brand-eyebrow">{note}</p>
                  <h3>
                    <Link to={productRoutes[i]}>
                      {title}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </h3>
                  <p>{text}</p>
                </div>
                <MaturityBadge variant="testnet">
                  <span lang="en">{SCOPE_LABELS.live}</span>
                </MaturityBadge>
              </article>
            ))}
          </div>
          <div className="landing-demo-head">
            <h3>{c.demoTitle}</h3>
            <MaturityBadge variant="demo">
              <span lang="en">{SCOPE_LABELS.demo}</span>
            </MaturityBadge>
          </div>
          <p className="landing-small max-w-3xl">{c.demoNote}</p>
          <ul className="landing-demos" role="list">
            {c.demos.map(([title, text], i) => (
              <li key={demoRoutes[i]}>
                <Link to={demoRoutes[i]}>
                  {title}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <article className="landing-planned">
            <div>
              <MaturityBadge variant="preview">
                <span lang="en">{SCOPE_LABELS.planned}</span>
              </MaturityBadge>
              <h3>{c.plannedTitle}</h3>
              <p className="landing-small">{c.plannedNote}</p>
            </div>
            <Link to="/roadmap" className="landing-text-link">
              {c.roadmapLink}
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </Section>
      </section>
      <section
        id="coffee-capital"
        className="landing-section landing-tinted"
        aria-labelledby="capital-title"
      >
        <Section className="landing-editorial-grid">
          <div>
            <p className="brand-eyebrow">{c.capitalKicker}</p>
            <h2 id="capital-title">{c.capitalTitle}</h2>
            <MaturityBadge variant="preview" className="mt-6">
              <span lang="en">{SCOPE_LABELS.planned}</span>
            </MaturityBadge>
          </div>
          <div className="landing-prose">
            <p className="landing-lead-strong">{c.capitalLead}</p>
            <p>{c.capitalText}</p>
            <p className="landing-small">{c.capitalNote}</p>
          </div>
        </Section>
      </section>
      <section id="roadmap" className="landing-section" aria-labelledby="roadmap-title">
        <Section>
          <div className="landing-editorial-grid">
            <div>
              <p className="brand-eyebrow">{c.roadmapKicker}</p>
              <h2 id="roadmap-title">{c.roadmapTitle}</h2>
            </div>
            <div className="landing-prose">
              <p>{c.roadmapText}</p>
              <Link to="/roadmap" className="landing-text-link">
                {c.roadmapLink}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <article className="landing-docs">
            <div>
              <h3>{c.docsTitle}</h3>
              <p className="landing-small">{c.docsText}</p>
            </div>
            <Link to="/app/docs" className="landing-text-link">
              {c.secondary}
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </Section>
      </section>
    </div>
  );
}
