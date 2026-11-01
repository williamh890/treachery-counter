// src/app/features/game/player/action-selector/action-options/action-options.config.ts

export type ActionType = 'Damage' | 'Healing' | 'Lifelink' | 'Infect' | 'Drain' | 'Extort';
export type ActionTarget = 'Player' | 'All' | 'Opponents';
export type ActionTag = 'Commander';

/** The options chosen in the selector. */
export interface ActionOptionsValue {
  target: ActionTarget;
  type: ActionType;
  tags: ActionTag[];
}

export const DEFAULT_ACTION_OPTIONS: ActionOptionsValue = {
  target: 'Player',
  type: 'Damage',
  tags: [],
};

// ---------- rules: what is available depends on the target (and type) ----------

export const TARGETS: readonly ActionTarget[] = ['Player', 'Opponents', 'All'];

export const TYPE_OPTIONS_BY_TARGET: Record<ActionTarget, readonly ActionType[]> = {
  Player: ['Damage', 'Healing', 'Lifelink', 'Infect'],
  All: ['Damage', 'Healing', 'Infect'],
  Opponents: ['Damage', 'Healing', 'Drain', 'Extort', 'Infect'],
};

/** Commander only applies to a single player, and not to healing. */
export function availableTags(target: ActionTarget, type: ActionType): readonly ActionTag[] {
  return target === 'Player' && type !== 'Healing' ? ['Commander'] : [];
}

/** Drops anything that's no longer valid after a change (e.g. switching target). */
export function normalizeOptions(value: ActionOptionsValue): ActionOptionsValue {
  const type = TYPE_OPTIONS_BY_TARGET[value.target].includes(value.type) ? value.type : 'Damage';
  const allowedTags = availableTags(value.target, type);
  return {
    target: value.target,
    type,
    tags: value.tags.filter((t) => allowedTags.includes(t)),
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
  Commander: { fill: '#c0c4cc', ink: '#111827', edge: '#c0c4cc' }, // silver
  Drain: { fill: '#000000', ink: '#ffffff', edge: '#8a8a8a' }, // black (grey edge so it shows)
  Extort: { fill: '#9333ea', ink: '#ffffff', edge: '#a855f7' }, // purple
};
