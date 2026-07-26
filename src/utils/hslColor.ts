/**
 * HSL colour utilities — canonical storage format for wardrobe colours.
 */

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToDisplayName(hsl: HslColor): string {
  const { h, s, l } = hsl;
  if (s < 12) {
    if (l < 18) return 'Black';
    if (l > 82) return 'White';
    return 'Gray';
  }
  if (l < 22) return 'Black';
  if (l > 88 && s < 25) return 'White';
  if (h < 20 || h >= 350) return l > 55 ? 'Pink' : 'Red';
  if (h < 45) return 'Orange';
  if (h < 70) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 190) return 'Teal';
  if (h < 250) return 'Blue';
  if (h < 290) return 'Purple';
  return 'Pink';
}

export function parseHslColor(value: unknown): HslColor | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.h !== 'number' || typeof v.s !== 'number' || typeof v.l !== 'number') return null;
  return {
    h: Math.max(0, Math.min(360, v.h)),
    s: Math.max(0, Math.min(100, v.s)),
    l: Math.max(0, Math.min(100, v.l)),
  };
}

export function parseHslArray(raw: unknown): HslColor[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseHslColor).filter((c): c is HslColor => c !== null);
}

/** Hue distance on a circle (0–180). */
export function hueDistance(a: HslColor, b: HslColor): number {
  const diff = Math.abs(a.h - b.h);
  return Math.min(diff, 360 - diff);
}

export function isNeutralHsl(hsl: HslColor): boolean {
  return hsl.s < 15 || hsl.l < 15 || hsl.l > 88;
}

export function colorHarmonyScoreHsl(picked: HslColor[], candidate: HslColor): number {
  if (picked.length === 0) return 75;
  const neutralCount = picked.filter(isNeutralHsl).length;
  const candNeutral = isNeutralHsl(candidate);
  if (neutralCount >= picked.length && !candNeutral) return 85;
  if (!candNeutral && picked.filter((p) => !isNeutralHsl(p)).length >= 2 && candNeutral) return 95;
  const avgHueDist = picked.reduce((sum, p) => sum + hueDistance(p, candidate), 0) / picked.length;
  if (avgHueDist < 30) return 90;
  if (avgHueDist < 60) return 75;
  if (avgHueDist < 120) return 60;
  return 40;
}

/** Legacy named colour → approximate HSL for migration reads. */
const NAMED_TO_HSL: Record<string, HslColor> = {
  black: { h: 0, s: 0, l: 8 },
  white: { h: 0, s: 0, l: 96 },
  gray: { h: 0, s: 0, l: 50 },
  grey: { h: 0, s: 0, l: 50 },
  navy: { h: 220, s: 55, l: 22 },
  blue: { h: 220, s: 70, l: 45 },
  red: { h: 0, s: 75, l: 45 },
  green: { h: 140, s: 45, l: 38 },
  yellow: { h: 48, s: 90, l: 55 },
  pink: { h: 340, s: 60, l: 70 },
  purple: { h: 280, s: 50, l: 45 },
  brown: { h: 25, s: 45, l: 30 },
  beige: { h: 38, s: 30, l: 78 },
  cream: { h: 45, s: 25, l: 92 },
  tan: { h: 32, s: 35, l: 62 },
  khaki: { h: 48, s: 25, l: 58 },
  olive: { h: 75, s: 30, l: 38 },
  orange: { h: 28, s: 85, l: 52 },
};

export function namedColorToHsl(name: string): HslColor {
  const key = name.trim().toLowerCase();
  for (const [token, hsl] of Object.entries(NAMED_TO_HSL)) {
    if (key.includes(token)) return { ...hsl };
  }
  return { h: 0, s: 0, l: 50 };
}

export function namedColorsToHsl(names: string[]): HslColor[] {
  return names.map(namedColorToHsl);
}

export function hslToCss(hsl: HslColor): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}
