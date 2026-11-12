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
  linkedSignal,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ActionOptionsValue,
  ActionTag,
  ActionTarget,
  ActionType,
  BUTTONS,
  ButtonDef,
  ButtonId,
  DEFAULT_ACTION_OPTIONS,
  TARGETS,
  availableTags,
  availableTypes,
  normalizeOptions,
} from './action-options.config';
import { OptionIcon } from './option-icon';

interface OptionGroup {
  id: keyof ActionOptionsValue;
  /** single: pick exactly one (radio). multi: toggle on and off (tags). */
  mode: 'single' | 'multi';
}

/**
 * One thing in a row. The key is stable across layouts, so Angular keeps the same
 * element when a pill moves, and the slide animation has something to follow.
 */
type Item =
  | { key: string; kind: 'divider' }
  | { key: string; kind: 'pill'; group: OptionGroup; id: ButtonId; def: ButtonDef };

interface Row {
  id: 'types' | 'targets';
  label: string;
  items: readonly Item[];
}

interface Point {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The one knob: base duration in ms. Everything else is a ratio of it. */
const BASE_MS = 200;

const LEAVE_MS = BASE_MS * 0.5;

const DUR = {
  /** Pills sliding to a new spot, and the options area changing height. */
  move: BASE_MS,
  /** Pills shrinking away. */
  leave: LEAVE_MS,
  /** New pills wait for leaving ones to finish, plus a small gap. Tied to leave on purpose. */
  enterDelay: LEAVE_MS * 1.2,
  enterFade: BASE_MS * 0.55,
  /** Click pop. */
  pop: BASE_MS * 0.9,
  /** Selected state: grow, glow, colors. */
  select: BASE_MS * 0.75,
} as const;

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

const TYPE_GROUP: OptionGroup = { id: 'type', mode: 'single' };
const TAG_GROUP: OptionGroup = { id: 'tags', mode: 'multi' };
const TARGET_GROUP: OptionGroup = { id: 'target', mode: 'single' };

const DIVIDER: Item = { key: 'divider', kind: 'divider' };

const pill = (group: OptionGroup, id: ButtonId): Item => ({
  key: `${group.id}:${id}`,
  kind: 'pill',
  group,
  id,
  def: BUTTONS[id],
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
      animation: pill-in var(--pill-in-fade) ease-out var(--pill-in-delay) backwards;
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
      [style.--pill-in-delay]="enterDelayCss"
      [style.--pill-in-fade]="enterFadeCss"
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
              @let id = item.id;
              @let def = item.def;
              @let selected = isSelected(group, id);
              <button
                type="button"
                class="flex touch-manipulation items-center justify-center gap-2 border-2 transition active:scale-95 [-webkit-tap-highlight-color:transparent]"
                [class]="pillClass(def, selected)"
                [class.pill-in]="fresh().has(item.key)"
                [style.transition-duration.ms]="dur.select"
                [style.--fill]="def.color.fill"
                [style.--ink]="def.color.ink"
                [style.--edge]="def.color.edge"
                [attr.data-key]="item.key"
                [attr.role]="group.mode === 'single' ? 'radio' : null"
                [attr.aria-checked]="group.mode === 'single' ? selected : null"
                [attr.aria-pressed]="group.mode === 'multi' ? selected : null"
                [attr.aria-label]="def.shape === 'square' ? def.label : null"
                (animate.leave)="leave($event)"
                (click)="choose(group, id, $event)"
              >
                <!-- Icon slot: same size in every state, so nothing shifts.
                     Square buttons are icon only, so their icon fills the button. -->
                <span
                  class="shrink-0"
                  [class]="def.shape === 'square' ? 'size-full scale-75' : 'size-[1.4em]'"
                  aria-hidden="true"
                >
                  <app-option-icon [name]="id" />
                </span>
                @if (def.shape !== 'square') {
                  {{ def.label }}
                }
              </button>
            } @else {
              <!-- Divider between the damage types and their tags -->
              <span
                class="h-[8cqmin] w-px shrink-0 bg-white/30"
                data-key="divider"
                [class.pill-in]="fresh().has('divider')"
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

  protected readonly dur = DUR;
  protected readonly enterDelayCss = `${DUR.enterDelay}ms`;
  protected readonly enterFadeCss = `${DUR.enterFade}ms`;

  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private container = viewChild.required<ElementRef<HTMLElement>>('container');
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** False until the first layout is measured, so the initial render doesn't animate. */
  private ready = false;
  /** Where each pill's center and size were after the last layout, by key. */
  private positions = new Map<string, Point>();
  private width = 0;
  private height = 0;

  /**
   * Type row on top, targets underneath. The tags (when the type has them) follow the
   * last type that takes tags, behind a divider, so they read as modifiers of it.
   */
  protected readonly rows = computed<readonly Row[]>(() => {
    const { target, type, tags: selectedTags } = this.value();
    const partner = this.partner();

    const types = availableTypes(target, selectedTags);
    const tags = availableTags(target, type, partner);

    const items: Item[] = types.map((t) => pill(TYPE_GROUP, t));

    if (tags.length) {
      const lastTaggable = types.reduce(
        (last, t, i) => (availableTags(target, t, partner).length ? i : last),
        -1,
      );
      items.splice(lastTaggable + 1, 0, DIVIDER, ...tags.map((t) => pill(TAG_GROUP, t)));
    }

    return [
      { id: 'types', label: 'Type', items },
      { id: 'targets', label: 'Targets', items: TARGETS.map((t) => pill(TARGET_GROUP, t)) },
    ];
  });

  /** Keys in the current layout. Anything else still in the DOM is on its way out. */
  private readonly currentKeys = computed(
    () => new Set(this.rows().flatMap((row) => row.items.map((i) => i.key))),
  );

  /**
   * Keys of pills that just appeared. Worked out from the previous layout, so the hidden
   * starting state is bound with the element's first render instead of added by a hook.
   * A key stays in the set for as long as its pill exists, so the class isn't removed mid-fade.
   */
  protected readonly fresh = linkedSignal<readonly Row[], ReadonlySet<string>>({
    source: this.rows,
    computation: (rows, previous) => {
      const keysOf = (r: readonly Row[]) =>
        new Set(r.flatMap((row) => row.items.map((i) => i.key)));
      if (!previous) return new Set<string>(); // first render: nothing animates in
      const before = keysOf(previous.source);
      const next = new Set<string>();
      for (const key of keysOf(rows)) {
        if (!before.has(key) || previous.value.has(key)) next.add(key);
      }
      return next;
    },
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
      const key = el.dataset['key']!;
      if (!this.currentKeys().has(key) || el.style.position === 'absolute') continue; // on its way out

      const pos = {
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
        w: el.offsetWidth,
        h: el.offsetHeight,
      };
      next.set(key, pos);

      const prev = this.positions.get(key);
      if (!canMove || !prev) continue;

      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
        duration: DUR.move,
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
        { duration: DUR.move, easing: EASE },
      );
    }

    this.positions = next;
    this.width = width;
    this.height = height;
    this.ready = true;
  }

  /**
   * Pills that disappear shrink and fade where they stand. They're pinned at the spot they
   * were last drawn (not where the new layout would put them) and taken out of flow right
   * away, so the remaining pills can start sliding into the gap immediately.
   */
  protected leave(e: AnimationCallbackEvent) {
    const el = e.target as HTMLElement;

    if (this.reducedMotion) {
      e.animationComplete();
      return;
    }

    const prev = this.positions.get(el.dataset['key'] ?? '');
    const w = prev?.w ?? el.offsetWidth;
    const h = prev?.h ?? el.offsetHeight;

    Object.assign(el.style, {
      position: 'absolute',
      left: `${prev ? prev.x - w / 2 : el.offsetLeft}px`,
      top: `${prev ? prev.y - h / 2 : el.offsetTop}px`,
      width: `${w}px`,
      height: `${h}px`,
      margin: '0',
      pointerEvents: 'none',
    });

    el.animate([{ opacity: 1 }, { opacity: 0, scale: '0.6' }], {
      duration: DUR.leave,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished.then(
      () => e.animationComplete(),
      () => e.animationComplete(),
    );
  }

  protected isSelected(group: OptionGroup, id: ButtonId) {
    const current = this.value()[group.id];
    return Array.isArray(current) ? (current as string[]).includes(id) : current === id;
  }

  /** Classes for a button: its shape decides the size and how it looks selected. */
  protected pillClass(def: ButtonDef, selected: boolean) {
    const size = 'min-h-[clamp(1.75rem,11cqmin,3.5rem)] text-[clamp(0.625rem,4cqmin,1.125rem)]';
    // Same glow everywhere, tinted by the button's edge color
    const glow = 'shadow-[0_0_14px_var(--edge)]';

    switch (def.shape) {
      // Small, icon only, always filled; selection is shown by the outline and glow
      case 'square':
        return `size-[clamp(2rem,12cqmin,3.5rem)] p-0 rounded-xl bg-[var(--fill)] text-[var(--ink)] ${
          selected
            ? `${glow} scale-105 border-white ring-2 ring-white ring-offset-2 ring-offset-neutral-900`
            : 'border-[var(--edge)]'
        }`;

      // Always filled with its color
      case 'rounded':
        return `${size} rounded-lg pl-[3cqmin] pr-[4cqmin] font-semibold bg-[var(--fill)] text-[var(--ink)] ${
          selected
            ? `${glow} scale-110 border-[var(--fill)] ring-2 ring-inset ring-[var(--ink)] font-bold`
            : 'border-[var(--edge)]'
        }`;

      // Dark until selected, then filled: the fill is the selected signal
      case 'pill':
        return `${size} rounded-full px-[3.5cqmin] py-0.5 font-semibold ${
          selected
            ? 'scale-110 border-[var(--edge)] bg-[var(--fill)] text-[var(--ink)] font-bold shadow-[0_0_14px_color-mix(in_srgb,var(--edge)_60%,transparent)]'
            : 'border-neutral-500 bg-neutral-800 text-white'
        }`;
    }
  }

  protected choose(group: OptionGroup, id: ButtonId, event: MouseEvent) {
    this.pop(event.currentTarget as HTMLElement);
    this.value.update((v) => {
      switch (group.id) {
        case 'target':
          return normalizeOptions({ ...v, target: id as ActionTarget }, this.partner());
        case 'type':
          return normalizeOptions({ ...v, type: id as ActionType }, this.partner());
        case 'tags': {
          const tag = id as ActionTag;
          // Tapping the selected tag clears it. normalizeOptions keeps one tag at a time,
          // so picking one replaces the other.
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
      { duration: DUR.pop, easing: 'ease-out' },
    );
  }
}
