// src/app/features/game/player/action-selector/action-options/action-options.ts
import {
  AnimationCallbackEvent,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ActionOptionsValue,
  ActionTag,
  ActionTarget,
  ActionType,
  COMMANDER_TYPES,
  DEFAULT_ACTION_OPTIONS,
  OPTION_COLORS,
  TARGETS,
  availableTags,
  availableTypes,
  normalizeOptions,
} from './action-options.config';
import { OptionIcon } from './option-icon';

interface OptionGroup {
  id: keyof ActionOptionsValue;
  /** Not shown; used as the accessible name of the group. */
  label: string;
  /** single: pick exactly one (radio). multi: any number, including none (toggle). */
  mode: 'single' | 'multi';
}

/**
 * One thing in a row. The key is stable across layouts, so Angular keeps the same
 * element when a pill moves, and the slide animation has something to follow.
 */
type Item =
  | { key: string; kind: 'divider' }
  | { key: string; kind: 'pill'; group: OptionGroup; option: string };

interface Row {
  id: 'types' | 'targets';
  label: string;
  items: readonly Item[];
}

interface Point {
  x: number;
  y: number;
}

/** How long pills (and the options height) take to settle into the new layout. */
const MOVE_MS = 260;
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

const TYPE_GROUP: OptionGroup = { id: 'type', label: 'Type', mode: 'single' };
const TAG_GROUP: OptionGroup = { id: 'tags', label: 'Tag', mode: 'multi' };
const TARGET_GROUP: OptionGroup = { id: 'target', label: 'Targets', mode: 'single' };

const pill = (group: OptionGroup, option: string): Item => ({
  key: `${group.id}:${option}`,
  kind: 'pill',
  group,
  option,
});

@Component({
  selector: 'app-action-options',
  host: { class: 'block' },
  imports: [OptionIcon],
  styles: `
    @keyframes pill-in {
      from {
        opacity: 0;
        scale: 0.6;
      }
    }
    .pill-in {
      animation: pill-in 200ms ease-out 80ms backwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .pill-in {
        animation: none;
      }
    }
  `,
  template: `
    <!-- relative: pills measure their position against this, and leaving pills are pinned to it -->
    <div
      #container
      class="relative flex flex-col items-center gap-[3cqmin] px-[3cqmin] py-[2cqmin]"
    >
      @for (row of rows(); track row.id) {
        <div
          class="flex flex-wrap items-center justify-center gap-[2.5cqmin]"
          role="radiogroup"
          [attr.aria-label]="row.label"
        >
          @for (item of row.items; track item.key) {
            @if (item.kind === 'pill') {
              @let group = item.group;
              @let option = item.option;
              @let selected = isSelected(group, option);
              <button
                type="button"
                class="flex touch-manipulation items-center justify-center gap-2 border-2 transition active:scale-95 [-webkit-tap-highlight-color:transparent]"
                [class]="pillClass(group, option, selected)"
                [style.--fill]="colors[option]?.fill ?? null"
                [style.--ink]="colors[option]?.ink ?? null"
                [style.--edge]="colors[option]?.edge ?? null"
                [attr.data-key]="item.key"
                [attr.role]="group.mode === 'single' ? 'radio' : null"
                [attr.aria-checked]="group.mode === 'single' ? selected : null"
                [attr.aria-pressed]="group.mode === 'multi' ? selected : null"
                [attr.aria-label]="group.id === 'tags' ? option : null"
                [animate.enter]="enterClass(item)"
                (animate.leave)="leave($event)"
                (click)="choose(group, option, $event)"
              >
                <!-- Icon slot: same size in every state, so nothing shifts.
                     Tags are icon-only, so their icon fills the button. -->
                <span
                  class="shrink-0"
                  [class]="group.id === 'tags' ? 'size-full scale-75' : 'size-[1.4em]'"
                  aria-hidden="true"
                >
                  <app-option-icon [name]="option" />
                </span>
                @if (group.id !== 'tags') {
                  {{ option }}
                }
              </button>
            } @else {
              <!-- Divider between the damage types and their tags -->
              <span
                class="h-[8cqmin] w-px shrink-0 bg-white/30"
                data-key="divider"
                [animate.enter]="enterClass(item)"
                (animate.leave)="leave($event)"
                aria-hidden="true"
              ></span>
            }
          }
        </div>
      }
    </div>
  `,
})
export class ActionOptions {
  /** Current choices. Two-way bindable: [(value)]="options". */
  value = model<ActionOptionsValue>(DEFAULT_ACTION_OPTIONS);

  partner = input.required<boolean>();

  protected readonly colors = OPTION_COLORS;

  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private container = viewChild.required<ElementRef<HTMLElement>>('container');
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** False until the first layout is measured, so the initial render doesn't animate. */
  private ready = false;
  /** Where each pill's center was after the last layout, by key. */
  private positions = new Map<string, Point>();
  private width = 0;
  private height = 0;

  /**
   * Type row on top, targets underneath. The tags (when the type can take them) follow the
   * damage-like types behind a divider, so they read as modifiers of the damage.
   */
  protected readonly rows = computed<readonly Row[]>(() => {
    const { target, type, tags: selectedTags } = this.value();

    const types = availableTypes(target, selectedTags);
    const tags = availableTags(target, type, this.partner());

    const items: Item[] = types.map((t) => pill(TYPE_GROUP, t));

    if (tags.length) {
      let lastDamage = -1;
      types.forEach((t, i) => {
        if (COMMANDER_TYPES.includes(t)) lastDamage = i;
      });
      items.splice(
        lastDamage + 1,
        0,
        { key: 'divider', kind: 'divider' },
        ...tags.map((t) => pill(TAG_GROUP, t)),
      );
    }

    return [
      { id: 'types', label: 'Type', items },
      { id: 'targets', label: 'Targets', items: TARGETS.map((t) => pill(TARGET_GROUP, t)) },
    ];
  });

  constructor() {
    // After every layout change, once the DOM has updated, slide things to their new spots
    effect(() => {
      this.rows();
      untracked(() => afterNextRender(() => this.flip(), { injector: this.injector }));
    });
  }

  /**
   * FLIP: compare each pill's layout position with where it was, and play the difference
   * backwards. Uses offsetLeft/offsetTop (layout space, ignores transforms), so it works
   * on rotated tiles, and the `translate` property, so it doesn't clash with scale/pop.
   * Also eases the options' height, so the area below (and the big count) resizes smoothly
   * when the pills wrap onto a different number of lines.
   */
  private flip() {
    const root = this.container().nativeElement;
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    // A resized tile moves everything; snap instead of sliding
    const canMove = this.ready && !this.reducedMotion && width === this.width;
    const next = new Map<string, Point>();

    for (const el of root.querySelectorAll<HTMLElement>('[data-key]')) {
      if (el.style.position === 'absolute') continue; // on its way out

      const key = el.dataset['key']!;
      const pos = { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
      next.set(key, pos);

      const prev = this.positions.get(key);
      if (!canMove || !prev) continue;

      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
        duration: MOVE_MS,
        easing: EASE,
      });
    }

    if (canMove && Math.abs(height - this.height) > 1) {
      // overflow: clip only while animating, so a growing area is revealed, not overlapped
      this.host.nativeElement.animate(
        [
          { height: `${this.height}px`, overflow: 'clip' },
          { height: `${height}px`, overflow: 'clip' },
        ],
        { duration: MOVE_MS, easing: EASE },
      );
    }

    this.positions = next;
    this.width = width;
    this.height = height;
    this.ready = true;
  }

  /**
   * Only genuinely new pills grow in; ones that merely moved slide via flip(). Done as a
   * class so the hidden starting state is there from the element's first frame.
   */
  protected enterClass(item: Item) {
    if (!this.ready || this.reducedMotion) return '';
    return this.positions.has(item.key) ? '' : 'pill-in';
  }

  /**
   * Pills that disappear shrink and fade where they stand. They're taken out of flow right
   * away, so the remaining pills can start sliding into the gap immediately.
   */
  protected leave(e: AnimationCallbackEvent) {
    const el = e.target as HTMLElement;

    if (this.reducedMotion) {
      e.animationComplete();
      return;
    }

    Object.assign(el.style, {
      position: 'absolute',
      left: `${el.offsetLeft}px`,
      top: `${el.offsetTop}px`,
      width: `${el.offsetWidth}px`,
      height: `${el.offsetHeight}px`,
      margin: '0',
      pointerEvents: 'none',
    });

    el.animate([{ opacity: 1 }, { opacity: 0, scale: '0.6' }], {
      duration: 140,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished.then(
      () => e.animationComplete(),
      () => e.animationComplete(),
    );
  }

  protected isSelected(group: OptionGroup, option: string) {
    const current = this.value()[group.id];
    return Array.isArray(current) ? (current as string[]).includes(option) : current === option;
  }

  protected pillClass(group: OptionGroup, option: string, selected: boolean) {
    const size = 'min-h-[clamp(1.75rem,11cqmin,3.5rem)] text-[clamp(0.625rem,4cqmin,1.125rem)]';
    // Same glow everywhere, tinted by the option's edge color (see OPTION_COLORS)
    const glow = 'shadow-[0_0_14px_var(--edge)]';

    // Tags: small square, no padding, so the icon can fill it. Always filled with the
    // tag's color; selection is shown by the outline and glow.
    if (group.id === 'tags') {
      const tagSize = 'size-[clamp(2rem,12cqmin,3.5rem)] p-0';
      return `${tagSize} rounded-xl bg-[var(--fill)] text-[var(--ink)] ${
        selected
          ? `${glow} scale-105 border-white ring-2 ring-white ring-offset-2 ring-offset-neutral-900`
          : 'border-[var(--edge)]'
      }`;
    }

    const shape =
      group.id === 'target'
        ? `${size} rounded-full px-[3.5cqmin] py-0.5 font-semibold`
        : `${size} rounded-lg pl-[3cqmin] pr-[4cqmin] font-semibold`;

    if (this.colors[option]) {
      return `${shape} bg-[var(--fill)] text-[var(--ink)] ${
        selected
          ? `${glow} scale-110 border-[var(--fill)] ring-2 ring-inset ring-[var(--ink)] font-bold`
          : 'border-[var(--edge)]'
      }`;
    }

    // Targets (no color config): white fill is the selected signal, plus a white glow
    return `${shape} ${
      selected
        ? 'scale-110 border-white bg-white text-black font-bold shadow-[0_0_14px_rgb(255_255_255/0.6)]'
        : 'border-neutral-500 bg-neutral-800 text-white'
    }`;
  }

  protected choose(group: OptionGroup, option: string, event: MouseEvent) {
    this.pop(event.currentTarget as HTMLElement);
    this.value.update((v) => {
      switch (group.id) {
        case 'target':
          return normalizeOptions({ ...v, target: option as ActionTarget }, this.partner());
        case 'type':
          return normalizeOptions({ ...v, type: option as ActionType }, this.partner());
        case 'tags': {
          const tag = option as ActionTag;
          // Commander and Partner are exclusive: picking one replaces the other,
          // tapping the selected one clears it.
          const tags: ActionTag[] = v.tags.includes(tag) ? [] : [tag];
          return normalizeOptions({ ...v, tags }, this.partner());
        }
      }
    });
  }

  private pop(el: HTMLElement) {
    if (this.reducedMotion) return;
    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)', offset: 0.4 },
        { transform: 'scale(1)' },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  }
}
