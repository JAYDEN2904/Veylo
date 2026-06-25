/**
 * Accessibility utilities and constants
 */

export const Accessibility = {
  contrast: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponents: 3.0,
  },

  labels: {
    scanButton: 'Scan clothing item',
    favoriteButton: 'Add to favorites',
    unfavoriteButton: 'Remove from favorites',
    shareButton: 'Share',
    saveButton: 'Save',
    deleteButton: 'Delete',
    editButton: 'Edit',
    backButton: 'Go back',
    closeButton: 'Close',
    searchButton: 'Search',
    filterButton: 'Filter',
    menuButton: 'Menu',
    settingsButton: 'Settings',
    generateOutfitButton: 'Generate outfit',
    tryOnButton: 'Try on outfit',
    viewOutfitButton: 'View outfit details',
    addToCalendarButton: 'Add to calendar',
  },

  hints: {
    scanButton: 'Take a photo of your clothing item to add it to your wardrobe',
    favoriteButton: 'Double tap to add this to your favorites',
    generateOutfit: 'Double tap to generate a new outfit based on your wardrobe',
    tryOn: 'Double tap to see how this outfit looks on you',
    filter: 'Double tap to filter items',
    search: 'Double tap to search your wardrobe',
  },
};

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

/** Relative luminance for sRGB (WCAG). */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Contrast ratio between two colors (1–21). Supports #RGB and #RRGGBB.
 */
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const c1 = parseHexColor(color1);
  const c2 = parseHexColor(color2);
  if (!c1 || !c2) {
    return 1;
  }
  const L1 = relativeLuminance(c1.r, c1.g, c1.b);
  const L2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const isAccessible = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText
    ? Accessibility.contrast.largeText
    : Accessibility.contrast.normalText;
  return ratio >= requiredRatio;
};
