// src/app/features/game/player/action-selector/action-options/action-options.config.ts
import { icons } from './action-options.icons';

export type ActionTarget = 'Player' | 'Opponents' | 'All';
export type ActionType = 'Damage' | 'Healing' | 'Lifelink' | 'Infect' | 'Drain' | 'Extort';
export type ActionTag = 'Commander' | 'Partner';
export type ButtonId = ActionTarget | ActionType | ActionTag;

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

// =====================================================================================
// 1. LOOKS: what each button looks like
// =====================================================================================

export interface OptionColor {
  /** Background of the pill. */
  fill: string;
  /** Icon/text color on top of `fill`. */
  ink: string;
  /** Border and glow color. Brighter than `fill` where `fill` would vanish on a dark background. */
  edge: string;
}

export interface Icon {
  /** Inner markup of a 24x24 SVG, drawn in currentColor. */
  svg: string;
  /** Lighter version for small spots like counter badges. Falls back to `svg`. */
  thinSvg?: string;
}

/**
 * pill:    fully rounded, icon and label (targets)
 * rounded: rounded corners, icon and label (types)
 * square:  small square, icon only; the label is just its accessible name (tags)
 */
export type Shape = 'pill' | 'rounded' | 'square';

export interface ButtonDef {
  label: string;
  shape: Shape;
  color: OptionColor;
  icon: Icon;
}

/** One object per button, keyed by the button's id. */
export const BUTTONS: Record<ButtonId, ButtonDef> = {
  // ---------- targets: white ----------
  Player: {
    label: 'Player',
    shape: 'pill',
    color: { fill: '#ffffff', ink: '#000000', edge: '#ffffff' },
    icon: { svg: icons['Player'] },
  },
  Opponents: {
    label: 'Opponents',
    shape: 'pill',
    color: { fill: '#ffffff', ink: '#000000', edge: '#ffffff' },
    icon: { svg: icons['Opponents'] },
  },
  All: {
    label: 'All',
    shape: 'pill',
    color: { fill: '#ffffff', ink: '#000000', edge: '#ffffff' },
    icon: { svg: icons['All'] },
  },

  // ---------- types ----------
  Damage: {
    label: 'Damage',
    shape: 'rounded',
    color: { fill: '#dc2626', ink: '#ffffff', edge: '#ef4444' }, // red
    icon: { svg: icons['Damage'] },
  },
  Healing: {
    label: 'Healing',
    shape: 'rounded',
    color: { fill: '#fafafa', ink: '#171717', edge: '#fafafa' }, // white
    icon: { svg: icons['Healing'] },
  },
  Lifelink: {
    label: 'Lifelink',
    shape: 'rounded',
    color: { fill: '#f0e2b0', ink: '#292524', edge: '#f0e2b0' }, // ivory
    icon: { svg: icons['Lifelink'] },
  },
  Infect: {
    label: 'Infect',
    shape: 'rounded',
    color: { fill: '#22c55e', ink: '#052e16', edge: '#22c55e' }, // green
    icon: { svg: icons['Infect'], thinSvg: icons['InfectThin'] },
  },
  Drain: {
    label: 'Drain',
    shape: 'rounded',
    color: { fill: '#000000', ink: '#ffffff', edge: '#8a8a8a' }, // black (grey edge so it shows)
    icon: { svg: icons['Drain'] },
  },
  Extort: {
    label: 'Extort',
    shape: 'rounded',
    color: { fill: '#9333ea', ink: '#ffffff', edge: '#a855f7' }, // purple
    icon: { svg: icons['Extort'] },
  },

  // ---------- tags ----------
  Commander: {
    label: 'Commander',
    shape: 'square',
    color: { fill: '#f59e0b', ink: '#1c1100', edge: '#fbbf24' }, // gold
    icon: { svg: icons['Commander'] },
  },
  Partner: {
    label: 'Partner',
    shape: 'square',
    color: { fill: '#38bdf8', ink: '#082f49', edge: '#7dd3fc' }, // sky blue
    icon: { svg: icons['Partner'] },
  },
};

/** For anything that should match a button's color (target frame, tile highlight...). */
export const optionColor = (id: ButtonId): OptionColor => BUTTONS[id].color;

// =====================================================================================
// 2. RELATIONS: which buttons show when
// =====================================================================================

/** Target buttons, in display order. Always all shown. */
export const TARGETS: readonly ActionTarget[] = ['Player', 'Opponents', 'All'];

/**
 * The picked target decides which type buttons show (the keys), and the picked type decides
 * which tag buttons show (the values). Everything is in display order.
 */
export const OPTION_TREE: Record<
  ActionTarget,
  Partial<Record<ActionType, readonly ActionTag[]>>
> = {
  Player: {
    Damage: ['Commander', 'Partner'],
    Lifelink: ['Commander', 'Partner'],
    Healing: [],
    Infect: [],
  },
  Opponents: { Damage: [], Healing: [], Drain: [], Extort: [], Infect: [] },
  All: { Damage: [], Healing: [], Infect: [] },
};

/** Type buttons for a target. With a tag picked, only the types that have tags. */
export function availableTypes(
  target: ActionTarget,
  tags: readonly ActionTag[],
): readonly ActionType[] {
  const types = Object.entries(OPTION_TREE[target]) as [ActionType, readonly ActionTag[]][];
  return types.filter(([, typeTags]) => !tags.length || typeTags.length).map(([type]) => type);
}

/** Tag buttons for a target and type. Partner needs a seat with a partner commander. */
export function availableTags(
  target: ActionTarget,
  type: ActionType,
  hasPartner: boolean,
): readonly ActionTag[] {
  const tags = OPTION_TREE[target][type] ?? [];
  return hasPartner ? tags : tags.filter((tag) => tag !== 'Partner');
}

/** Drops anything that's no longer valid after a change (e.g. switching target). */
export function normalizeOptions(
  value: ActionOptionsValue,
  hasPartner: boolean,
): ActionOptionsValue {
  const { target } = value;
  // Falls back to the target's first type
  const type = value.type in OPTION_TREE[target] ? value.type : availableTypes(target, [])[0];
  const allowed = availableTags(target, type, hasPartner);
  // One tag at a time: Commander and Partner are exclusive
  const tags = value.tags.filter((tag) => allowed.includes(tag)).slice(0, 1);
  return { target, type, tags };
}
