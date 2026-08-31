/**
 * Canonical font family names registered via `useFonts` in App.tsx.
 * Custom fonts do not synthesize weights — always pick the matching file.
 */
export const Fonts = {
  displaySemiBold: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export type FontWeightToken = '400' | '500' | '600' | '700' | '800';

/** Map a numeric/string weight to the Inter face that actually ships that weight. */
export function interForWeight(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === '500') return Fonts.bodyMedium;
  if (w === '600') return Fonts.bodySemiBold;
  if (w === '700' || w === '800') return Fonts.bodyBold;
  return Fonts.bodyRegular;
}

/** Display (Fraunces) face for headers; falls back to bold Inter for body-bold requests. */
export function frauncesForWeight(weight?: string | number): string {
  const w = String(weight ?? '700');
  if (w === '600') return Fonts.displaySemiBold;
  return Fonts.displayBold;
}
