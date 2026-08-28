/**
 * Icon size preference (additive feature).
 * Stored in the user profile as `iconSize`: 'small' | 'medium' | 'large'.
 * Every consumer multiplies its base icon glyph size by the scale factor,
 * so all feature icons across the app grow/shrink together.
 */
export const ICON_SIZE_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' }, // default
  { label: 'Large', value: 'large' },
];

export const DEFAULT_ICON_SIZE = 'medium';

const SCALES = { small: 0.85, medium: 1, large: 1.25 };

export function getIconScale(iconSize) {
  return SCALES[iconSize] ?? 1;
}

/** Round a base glyph size by the user's icon-size preference. */
export function scaledIcon(baseSize, iconSize) {
  return Math.round(baseSize * getIconScale(iconSize));
}
