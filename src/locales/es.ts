import type en from "./en";

type SpanishDegenCopy = { [K in keyof typeof en.degen]: string };

const es: { degen: SpanishDegenCopy } = {
  degen: {
    standard: "Estándar",
    toggle: "Modo Degen",
    active: "DEGEN ACTIVO ☕📈",
    banner: "MODO DEGEN ACTIVO · PERPETUOS CAFEINADOS 🚀",
    long: "MUMU LONG (!Pump! ☕)",
    short: "BOBO SHORT (!Hedge! 🐻)",
    mumu_win: "¡Mumu Aprobado! Ganancias Doble Espresso 🚀",
    bobo_hedge: "Protección de Bobo: Cosecha Coberturada 🛡️",
    status_holder: "Staking degen de NEAR activo",
  },
};

export default es;
