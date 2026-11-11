// src/app/features/game/player/action-selector/action-options/action-options.config.ts

export type ActionType = 'Damage' | 'Healing' | 'Lifelink' | 'Infect' | 'Drain' | 'Extort';
export type ActionTarget = 'Player' | 'All' | 'Opponents';
export type ActionTag = 'Commander' | 'Partner';

/** The options chosen in the selector. */
export interface ActionOptionsValue {
  target: ActionTarget;
  type: ActionType;
  tags: ActionTag[];
}

/** What the selector emits on Submit: the count plus the chosen options. */
export interface ActionSubmission {
  count: number;
  options: ActionOptionsValue;
}

export const DEFAULT_ACTION_OPTIONS: ActionOptionsValue = {
  target: 'Player',
  type: 'Damage',
  tags: [],
};

// ---------- rules: what is available depends on the target (and type) ----------

export const TARGETS: readonly ActionTarget[] = ['Player', 'Opponents', 'All'];

/** Types that deal damage, so the only ones the commander tags can combine with. */
export const COMMANDER_TYPES: readonly ActionType[] = ['Damage', 'Lifelink'];

/** Tags that mark commander damage. Mutually exclusive: at most one at a time. */
export const COMMANDER_TAGS: readonly ActionTag[] = ['Commander', 'Partner'];

export const TYPE_OPTIONS_BY_TARGET: Record<ActionTarget, readonly ActionType[]> = {
  // Damage-like types come first so they sit next to the tags
  Player: ['Damage', 'Lifelink', 'Healing', 'Infect'],
  All: ['Damage', 'Healing', 'Infect'],
  Opponents: ['Damage', 'Healing', 'Drain', 'Extort', 'Infect'],
};

/** Drops anything that's no longer valid after a change (e.g. switching target). */
export function normalizeOptions(value: ActionOptionsValue, partner: boolean): ActionOptionsValue {
  const type = TYPE_OPTIONS_BY_TARGET[value.target].includes(value.type) ? value.type : 'Damage';
  const allowedTags = availableTags(value.target, type, partner);
  return {
    target: value.target,
    type,
    // At most one tag: Commander and Partner are exclusive
    tags: value.tags.filter((t) => allowedTags.includes(t)).slice(0, 1),
  };
}

// ---------- colors ----------

export interface OptionColor {
  /** Background of the selected pill, and the dot on the unselected one. */
  fill: string;
  /** Text/check color on top of `fill`. */
  ink: string;
  /** Border color. Brighter than `fill` where `fill` would vanish on a dark background. */
  edge: string;
}

/**
 * Reusable for anything that should match an option (count, tile tint, buttons...).
 * Mid-tone on purpose: only the selected pill is filled, the rest stay dark.
 */
export const OPTION_COLORS: Partial<Record<string, OptionColor>> = {
  Damage: { fill: '#dc2626', ink: '#ffffff', edge: '#ef4444' }, // red
  Healing: { fill: '#fafafa', ink: '#171717', edge: '#fafafa' }, // white
  Lifelink: { fill: '#f0e2b0', ink: '#292524', edge: '#f0e2b0' }, // ivory
  Infect: { fill: '#22c55e', ink: '#052e16', edge: '#22c55e' }, // green
  Commander: { fill: '#f59e0b', ink: '#1c1100', edge: '#fbbf24' }, // gold
  Partner: { fill: '#38bdf8', ink: '#082f49', edge: '#7dd3fc' }, // sky blue
  Drain: { fill: '#000000', ink: '#ffffff', edge: '#8a8a8a' }, // black (grey edge so it shows)
  Extort: { fill: '#9333ea', ink: '#ffffff', edge: '#a855f7' }, // purple
};

const FALLBACK_COLOR: OptionColor = { fill: '#737373', ink: '#ffffff', edge: '#a3a3a3' };

export function optionColor(key: string): OptionColor {
  return OPTION_COLORS[key] ?? FALLBACK_COLOR;
}

/** Types shown for a target; with a commander tag toggled, only the damage types. */
export function availableTypes(
  target: ActionTarget,
  tags: readonly ActionTag[],
): readonly ActionType[] {
  const types = TYPE_OPTIONS_BY_TARGET[target];
  return tags.some((t) => COMMANDER_TAGS.includes(t))
    ? types.filter((t) => COMMANDER_TYPES.includes(t))
    : types;
}

/** Tags that exist for a target, whether or not the current type allows them. */
export function tagOptions(target: ActionTarget, hasPartner: boolean): readonly ActionTag[] {
  if (target !== 'Player') return [];
  return hasPartner ? COMMANDER_TAGS : ['Commander'];
}

/** Tags usable right now: only on damage types. Empty means "collapse the tags". */
export function availableTags(
  target: ActionTarget,
  type: ActionType,
  hasPartner: boolean,
): readonly ActionTag[] {
  return COMMANDER_TYPES.includes(type) ? tagOptions(target, hasPartner) : [];
}
