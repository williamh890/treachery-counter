// src/app/features/game/player/action-selector/action-options/action-options.icons.ts

/**
 * Inner markup of 24x24 SVGs, drawn in currentColor. Shapes are filled; details (the
 * letters in the crowns, the flask's neck) are cut out with fill-rule="evenodd", so they
 * work on any pill color.
 */
export const icons = {
  // ---------- targets: solid people ----------
  Player: `<circle cx="12" cy="8" r="3.8" /><path d="M5 20.5c0-4 3.1-7 7-7s7 3 7 7z" />`,
  Opponents: `<circle cx="7" cy="8" r="3.2" /><path d="M2.5 20c0-3.4 2-5.8 4.5-5.8s4.5 2.4 4.5 5.8z" /><circle cx="17" cy="8" r="3.2" /><path d="M12.5 20c0-3.4 2-5.8 4.5-5.8s4.5 2.4 4.5 5.8z" />`,
  // One in front, one behind on each side
  All: `<circle cx="12" cy="8" r="3.2" /><path d="M7 20.5c0-3.4 2.2-6 5-6s5 2.6 5 6z" /><circle cx="3.4" cy="10.4" r="2" /><path d="M0.8 19c0-2.6 1.2-4.5 2.6-4.5s2.6 1.9 2.6 4.5z" /><circle cx="20.6" cy="10.4" r="2" /><path d="M18 19c0-2.6 1.2-4.5 2.6-4.5s2.6 1.9 2.6 4.5z" />`,

  // ---------- types ----------
  // Sword, pointing up and to the right
  Damage: `<g transform="rotate(45 12 12) translate(0 1.2)"><path d="M12-1.5l2.3 3.2V14H9.7V1.7z" /><rect x="5.5" y="14" width="13" height="2.4" rx="1.2" /><rect x="10.8" y="16.4" width="2.4" height="4" /><circle cx="12" cy="21.6" r="1.6" /></g>`,
  // Flask: lip, narrow neck, wide body
  Healing: `<rect x="8.5" y="2" width="7" height="2" rx="1" /><path d="M10 4h4v5.5l5.6 10.2a1.8 1.8 0 0 1-1.6 2.8H6a1.8 1.8 0 0 1-1.6-2.8L10 9.5z" />`,
  // Heart, nudged up so it looks centered in the box
  Lifelink: `<path transform="translate(0 -2.2)" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />`,
  // Phyrexian mana symbol: a ring with a bar through it
  Infect: `<circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" stroke-width="3.4" /><rect x="10.4" y="2" width="3.2" height="20" rx="1.6" />`,
  InfectThin: `<circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" stroke-width="2" /><rect x="11" y="2" width="2" height="20" rx="1" />`,
  // Funnel
  Drain: `<path stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M3.5 4.5h17L14 12.5v6.2l-4 2.3v-8.5z" />`,
  // Blood drop
  Extort: `<path d="M12 2.5s6.5 6.6 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 9.1 12 2.5 12 2.5z" />`,

  // ---------- tags: a crown with a letter cut out of it ----------
  Commander: `<path fill-rule="evenodd" d="M2.5 7.4l5 4L12 4.3l4.5 7.1 5-4-1.9 11.2H4.4z M14.2 11.9A2.9 2.9 0 1 0 14.2 15.6L12.9 14.5A1.2 1.2 0 1 1 12.9 13z" />`,
  Partner: `<path fill-rule="evenodd" d="M2.5 7.4l5 4L12 4.3l4.5 7.1 5-4-1.9 11.2H4.4z M9.4 10.9H12.2a2.2 2.2 0 0 1 0 4.4H11.2V16.6H9.4z M11.2 12.4H12.2a.7.7 0 0 1 0 1.4H11.2z" />`,
};
