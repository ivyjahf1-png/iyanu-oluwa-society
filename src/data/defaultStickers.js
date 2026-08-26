/**
 * defaultStickers — pre-defined sticker collection for the meeting-chat
 * sticker sheet (WhatsApp-style quick-filter grid).
 *
 * Categories drive the horizontal quick-filter bar above the grid; the
 * special 'All' category shows every sticker at once.
 */

export const STICKER_CATEGORIES = ['All', 'Hi', 'Haha', 'Love', 'Sad', 'Wow'];

export const DEFAULT_STICKERS = [
  { id: 'stk_1', category: 'Hi', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' },
  { id: 'stk_2', category: 'Haha', url: 'https://cdn-icons-png.flaticon.com/512/742/742920.png' },
  { id: 'stk_3', category: 'Love', url: 'https://cdn-icons-png.flaticon.com/512/742/742752.png' },
  { id: 'stk_4', category: 'Sad', url: 'https://cdn-icons-png.flaticon.com/512/742/742784.png' },
  { id: 'stk_5', category: 'Wow', url: 'https://cdn-icons-png.flaticon.com/512/742/742940.png' },
];

/** Stickers visible for a given active filter category ('All' shows everything). */
export function stickersForCategory(category) {
  if (!category || category === 'All') return DEFAULT_STICKERS;
  return DEFAULT_STICKERS.filter(s => s.category === category);
}
