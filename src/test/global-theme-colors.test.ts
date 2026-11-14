import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const rootBlock = css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? "";
const nightBlock = css.match(/(?::root)?\.dark\s*\{([^}]+)\}/)?.[1] ?? "";
const declarations = (block: string) =>
  Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));

type RGB = [number, number, number];

// Convert authored OKLCH tokens to linear sRGB for WCAG 2 contrast, clipping
// out-of-gamut channels as an sRGB display does. No browser CSS mock is involved.
function color(tokens: Record<string, string>, name: string): RGB {
  const value = tokens[`--${name}`];
  if (!value) throw new Error(`Missing color token: ${name}`);
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) return color(tokens, alias[1]);
  const match = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!match) throw new Error(`Unsupported color token: ${name} = ${value}`);
  const [, lightness, chroma, hue] = match.map(Number);
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel))) as RGB;
}

function contrast(a: RGB, b: RGB) {
  const luminance = ([r, g, blue]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * blue;
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// Alpha utilities mix the token with transparent using premultiplied alpha.
// Composite that color over the actual surface in sRGB, then linearize for WCAG.
function tinted(tokens: Record<string, string>, ink: string, surface: string, alpha: number): RGB {
  const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const linearize = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const foreground = color(tokens, ink).map(encode);
  const background = color(tokens, surface).map(encode);
  return foreground.map((channel, i) =>
    linearize(channel * alpha + background[i] * (1 - alpha)),
  ) as RGB;
}

const textPairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["highlight-foreground", "highlight"],
  ["warning-foreground", "warning"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];

for (const mode of ["light", "night"] as const) {
  describe(`${mode} semantic color contract`, () => {
    const tokens = {
      ...declarations(rootBlock),
      ...(mode === "night" ? declarations(nightBlock) : {}),
    };
    it("keeps regular text pairs at WCAG AA contrast", () => {
      for (const [foreground, background] of textPairs) {
        expect(
          contrast(color(tokens, foreground), color(tokens, background)),
          `${foreground} / ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
    it("keeps status text legible on cards and its 15% tinted badge surface", () => {
      for (const status of ["gain", "loss"]) {
        for (const surface of ["card", "background"]) {
          expect(
            contrast(color(tokens, status), color(tokens, surface)),
            `${status} / ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            contrast(color(tokens, status), tinted(tokens, status, surface, 0.15)),
            `${status} badge / ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it("gives essential control borders and focus rings at least 3:1 contrast", () => {
      for (const token of ["input", "ring"]) {
        for (const surface of ["card", "background"]) {
          expect(
            contrast(color(tokens, token), color(tokens, surface)),
            `${token} / ${surface}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });
    it("keeps intentional forest hero and feature bands readable in both modes", () => {
      for (const surface of ["hero", "feature"]) {
        for (const token of ["foreground", "muted", "highlight"]) {
          expect(
            contrast(color(tokens, `${surface}-${token}`), color(tokens, surface)),
            `${surface}-${token}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        contrast(color(tokens, "hero-action-foreground"), color(tokens, "hero-action")),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(color(tokens, "hero-action-foreground"), color(tokens, "hero-action-hover")),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });
}

it("defaults native controls to light and limits night overrides to the document root", () => {
  expect(rootBlock).toMatch(/color-scheme:\s*light;/);
  expect(nightBlock).toMatch(/color-scheme:\s*dark;/);
  expect(css).not.toMatch(/(?<!:root)\.dark\s*\{/);
  expect(css).not.toMatch(/prefers-color-scheme/);
});

it("keeps every night chart stroke visible against the card surface", () => {
  const tokens = { ...declarations(rootBlock), ...declarations(nightBlock) };
  for (const token of ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]) {
    expect(contrast(color(tokens, token), color(tokens, "card")), token).toBeGreaterThanOrEqual(3);
  }
});

it("maps overlay, hero and feature surfaces to shared Tailwind tokens", () => {
  for (const token of ["overlay", "hero", "hero-foreground", "feature", "feature-foreground"]) {
    expect(css).toContain(`--color-${token}: var(--${token});`);
  }
});
