// src/app/features/game/player/action-selector/action-options/action-options.ts
import { NgTemplateOutlet } from '@angular/common';
import {
  AnimationCallbackEvent,
  Component,
  DestroyRef,
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
  tagOptions,
} from './action-options.config';
import { OptionIcon } from './option-icon';

interface OptionGroup {
  id: keyof ActionOptionsValue;
  /** Not shown; used as the accessible name of the group. */
  label: string;
  /** single: pick exactly one (radio). multi: any number, including none (toggle). */
  mode: 'single' | 'multi';
  options: readonly string[];
}

/** A run of groups. `joined` draws them inside one shared outline. */
interface Segment {
  groups: readonly OptionGroup[];
  joined: boolean;
  /** Joined clusters only: tags are tucked away because the type can't take them. */
  collapsed: boolean;
}

interface Point {
  x: number;
  y: number;
}

/** How long pills take to slide to their new spot. */
const MOVE_MS = 260;
/** Matches the tag collapse transition (duration-300) plus a little slack. */
const SETTLE_MS = 320;

const TARGET_GROUP: OptionGroup = {
  id: 'target',
  label: 'Targets',
  mode: 'single',
  options: TARGETS,
};

const typeGroup = (options: readonly ActionType[]): OptionGroup => ({
  id: 'type',
  label: 'Type',
  mode: 'single',
  options,
});

@Component({
  selector: 'app-action-options',
  host: { class: 'block' },
  imports: [OptionIcon, NgTemplateOutlet],
  template: `
    <!-- relative: leaving pills are positioned against this while they fade out -->
    <div
      #container
      class="relative flex flex-col items-center gap-[3cqmin] px-[3cqmin] py-[2cqmin]"
    >
      @for (row of rows(); track $index) {
        <div class="flex flex-wrap items-center justify-center gap-[2.5cqmin]">
          @for (segment of row; track $index) {
            <!-- Joined: damage types and tags share one outline, so the tags read as
                 modifiers of the damage. Otherwise display: contents lets pills wrap as one flow. -->
            <div
              [class]="
                segment.joined
                  ? 'flex items-center gap-[2cqmin] rounded-xl bg-white/5 p-[1.2cqmin] ring-1 ring-white/25'
                  : 'contents'
              "
            >
              @for (group of segment.groups; track $index) {
                @if (group.id === 'tags') {
                  <!-- Collapsing wrapper: 1fr <-> 0fr animates the width, and the negative margin
       swallows the flex gap, so Lifelink ends up flush with the cluster's edge.
       The transition timings belong to the state being entered, so opening and
       closing can differ: opening fades in after the space has started to open,
       closing fades out first. -->
                  <div
                    class="grid transition-[grid-template-columns,margin-left,opacity] duration-300 ease-out motion-reduce:transition-none"
                    [class]="
                      segment.collapsed
                        ? 'ml-[-2cqmin] grid-cols-[0fr] opacity-0 [transition-duration:300ms,300ms,120ms]'
                        : 'ml-0 grid-cols-[1fr] opacity-100 [transition-delay:0ms,0ms,100ms] [transition-duration:300ms,300ms,200ms]'
                    "
                    [attr.inert]="segment.collapsed ? '' : null"
                  >
                    <!-- Clip: overflow-hidden crops the tags while the width is closed. The padding and
         matching negative margins leave room inside the clip for the glow and ring. -->
                    <div
                      class="-mx-[2cqmin] -my-[2cqmin] min-w-0 overflow-hidden px-[2cqmin] py-[2cqmin]"
                    >
                      <!-- Motion: the tags slide out from behind Lifelink instead of scaling up -->
                      <div
                        class="flex items-center gap-[2cqmin] transition-transform duration-300 ease-out motion-reduce:transition-none"
                        [class]="segment.collapsed ? '-translate-x-[6cqmin]' : 'translate-x-0'"
                      >
                        <span
                          class="h-[8cqmin] w-px shrink-0 bg-white/30"
                          aria-hidden="true"
                        ></span>
                        <div class="contents" role="group" [attr.aria-label]="group.label">
                          @for (option of group.options; track option) {
                            <ng-container
                              *ngTemplateOutlet="pill; context: { group: group, option: option }"
                            />
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div
                    class="contents"
                    [attr.role]="group.mode === 'single' ? 'radiogroup' : 'group'"
                    [attr.aria-label]="group.label"
                  >
                    @for (option of group.options; track option) {
                      <ng-container
                        *ngTemplateOutlet="pill; context: { group: group, option: option }"
                      />
                    }
                  </div>
                }
              }
            </div>
          }
        </div>
      }
    </div>

    <ng-template #pill let-group="group" let-option="option">
      @let selected = isSelected(group, option);
      <!-- data-key: identity for the slide animation. Tags are left out; they have the
           collapse transition instead. -->
      <button
        type="button"
        class="flex touch-manipulation items-center justify-center gap-2 border-2 transition active:scale-95 [-webkit-tap-highlight-color:transparent]"
        [class]="pillClass(group, option, selected)"
        [style.--fill]="colors[option]?.fill ?? null"
        [style.--ink]="colors[option]?.ink ?? null"
        [style.--edge]="colors[option]?.edge ?? null"
        [attr.data-key]="group.id === 'tags' ? null : group.id + ':' + option"
        [attr.role]="group.mode === 'single' ? 'radio' : null"
        [attr.aria-checked]="group.mode === 'single' ? selected : null"
        [attr.aria-pressed]="group.mode === 'multi' ? selected : null"
        [attr.aria-label]="group.id === 'tags' ? option : null"
        [animate.enter]="enterClass(group, option)"
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
    </ng-template>
  `,
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
})
export class ActionOptions {
  /** Current choices. Two-way bindable: [(value)]="options". */
  value = model<ActionOptionsValue>(DEFAULT_ACTION_OPTIONS);

  partner = input.required<boolean>();

  protected readonly colors = OPTION_COLORS;
  /** Only genuinely new pills grow in; pills that merely moved slide via flip(). */
  protected enterClass(group: OptionGroup, option: string) {
    if (!this.ready || this.reducedMotion || group.id === 'tags') return '';
    return this.positions.has(`${group.id}:${option}`) ? '' : 'pill-in';
  }

  private injector = inject(Injector);
  private container = viewChild.required<ElementRef<HTMLElement>>('container');
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** False until the first layout is measured, so the initial render doesn't animate. */
  private ready = false;
  /** Where each pill's center was after the last layout, by data-key. */
  private positions = new Map<string, Point>();
  private width = 0;
  /** Collapsed state of the tag cluster last time; null when there's no cluster. */
  private lastCollapsed: boolean | null = null;
  /** True while the tag collapse transition runs; it moves pills by itself. */
  private settling = false;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Type row on top, targets underneath. The types offered depend on the picked target.
   * For target Player, the damage types and the tags form one joined cluster; the tags
   * stay mounted and collapse when the current type can't take them.
   */
  protected readonly rows = computed<readonly (readonly Segment[])[]>(() => {
    const { target, type, tags: selectedTags } = this.value();

    const types = availableTypes(target, selectedTags);
    const tags = tagOptions(target, this.partner());
    const targetRow: Segment[] = [{ groups: [TARGET_GROUP], joined: false, collapsed: false }];

    // Opponents / All have no tags, so no cluster
    if (!tags.length) {
      return [[{ groups: [typeGroup(types)], joined: false, collapsed: false }], targetRow];
    }

    const tagGroup: OptionGroup = { id: 'tags', label: 'Tag', mode: 'multi', options: tags };
    const damage = types.filter((t) => COMMANDER_TYPES.includes(t));
    const other = types.filter((t) => !COMMANDER_TYPES.includes(t));

    const typeRow: Segment[] = [
      {
        groups: [typeGroup(damage), tagGroup],
        joined: true,
        collapsed: availableTags(target, type, this.partner()).length === 0,
      },
    ];
    if (other.length) {
      typeRow.push({ groups: [typeGroup(other)], joined: false, collapsed: false });
    }

    return [typeRow, targetRow];
  });

  /** Keys of every animated pill in the current layout. */
  private readonly currentKeys = computed(
    () =>
      new Set(
        this.rows()
          .flat()
          .flatMap((s) => s.groups)
          .filter((g) => g.id !== 'tags')
          .flatMap((g) => g.options.map((o) => `${g.id}:${o}`)),
      ),
  );

  constructor() {
    // After every layout change, once the DOM has updated, slide pills to their new spots
    effect(() => {
      const cluster = this.rows()
        .flat()
        .find((s) => s.joined);
      const collapsed = cluster ? cluster.collapsed : null;

      untracked(() => {
        // The tag collapse moves its neighbours with a CSS transition; don't fight it
        if (collapsed !== null && this.lastCollapsed !== null && collapsed !== this.lastCollapsed) {
          this.settle();
        }
        this.lastCollapsed = collapsed;
        afterNextRender(() => this.flip(), { injector: this.injector });
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.settleTimer));
  }

  private settle() {
    this.settling = true;
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settling = false;
      this.flip(false); // just record where everything ended up
    }, SETTLE_MS);
  }

  /**
   * FLIP: compare each pill's layout position with where it was, and play the difference
   * backwards. Uses offsetLeft/offsetTop (layout space, ignores transforms), so it works
   * on rotated tiles, and the `translate` property, so it doesn't clash with scale/pop.
   */
  private flip(animate = true) {
    const root = this.container().nativeElement;
    const width = root.offsetWidth;
    // A resized tile moves everything; snap instead of sliding
    const canMove =
      animate && this.ready && !this.settling && !this.reducedMotion && width === this.width;
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
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      });
    }

    this.positions = next;
    this.width = width;
    this.ready = true;
  }

  /** New pills grow and fade in, a beat after the others start sliding. */
  protected enter(e: AnimationCallbackEvent) {
    const el = e.target as HTMLElement;
    const key = el.dataset['key'];

    // A pill that merely changed groups slides in from its old spot instead (see flip)
    const isNew = !key || !this.positions.has(key);
    if (this.ready && !this.reducedMotion && isNew) {
      // One keyframe: the end state is whatever the pill's classes say (e.g. selected size)
      el.animate([{ opacity: 0, scale: '0.6' }], {
        duration: 200,
        delay: 80,
        easing: 'ease-out',
        fill: 'backwards',
      });
    }
    e.animationComplete();
  }

  /**
   * Pills that disappear shrink and fade where they stand. They're taken out of flow right
   * away, so the remaining pills can start sliding into the gap immediately.
   */
  protected leave(e: AnimationCallbackEvent) {
    const el = e.target as HTMLElement;
    const key = el.dataset['key'];

    // Tags have their own collapse; a pill that reappears under the same key slides instead
    if (!key || this.reducedMotion || this.currentKeys().has(key)) {
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
