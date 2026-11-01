// src/app/features/game/player/action-selector/action-options/action-options.ts
import { Component, computed, model } from '@angular/core';
import {
  ActionOptionsValue,
  ActionTag,
  ActionTarget,
  ActionType,
  DEFAULT_ACTION_OPTIONS,
  OPTION_COLORS,
  TARGETS,
  TYPE_OPTIONS_BY_TARGET,
  availableTags,
  normalizeOptions,
} from './action-options.config';

interface OptionGroup {
  id: keyof ActionOptionsValue;
  /** Not shown; used as the accessible name of the group. */
  label: string;
  /** single: pick exactly one (radio). multi: any number, including none (toggle). */
  mode: 'single' | 'multi';
  options: readonly string[];
}

const TARGET_GROUP: OptionGroup = {
  id: 'target',
  label: 'Targets',
  mode: 'single',
  options: TARGETS,
};

@Component({
  selector: 'app-action-options',
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center gap-2 px-3 py-2">
      @for (row of rows(); track $index) {
        <div class="flex flex-wrap justify-center gap-1.5">
          @for (group of row; track group.id) {
            <!-- display: contents lets every pill in the row wrap as one flow -->
            <div
              class="contents"
              [attr.role]="group.mode === 'single' ? 'radiogroup' : 'group'"
              [attr.aria-label]="group.label"
            >
              @for (option of group.options; track option) {
                @let selected = isSelected(group, option);
                <button
                  type="button"
                  class="flex touch-manipulation items-center gap-2 border-2 transition [-webkit-tap-highlight-color:transparent]"
                  [class]="pillClass(group, option, selected)"
                  [style.--fill]="colors[option]?.fill ?? null"
                  [style.--ink]="colors[option]?.ink ?? null"
                  [style.--edge]="colors[option]?.edge ?? null"
                  [attr.role]="group.mode === 'single' ? 'radio' : null"
                  [attr.aria-checked]="group.mode === 'single' ? selected : null"
                  [attr.aria-pressed]="group.mode === 'multi' ? selected : null"
                  (click)="choose(group, option)"
                >
                  <!-- Indicator slot: same size in every state, so nothing shifts -->
                  <span class="grid size-4 shrink-0 place-items-center" aria-hidden="true">
                    @if (selected) {
                      <span class="text-base leading-none">&#x2713;</span>
                    } @else {
                      <!-- TODO: Replace this placeholder SVG with your custom icon later -->
                      <svg
                        class="size-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <circle cx="12" cy="12" r="8" stroke-dasharray="4 3" />
                      </svg>
                    }
                  </span>
                  {{ option }}
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ActionOptions {
  /** Current choices. Two-way bindable: [(value)]="options". */
  value = model<ActionOptionsValue>(DEFAULT_ACTION_OPTIONS);

  protected readonly colors = OPTION_COLORS;

  /** Type row on top, targets underneath. The types offered depend on the picked target. */
  protected readonly rows = computed<readonly (readonly OptionGroup[])[]>(() => {
    const { target, type } = this.value();

    const typeGroup: OptionGroup = {
      id: 'type',
      label: 'Type',
      mode: 'single',
      options: TYPE_OPTIONS_BY_TARGET[target],
    };

    // Commander is a toggle that sits in the type row and combines with the type.
    const tags = availableTags(target, type);
    const tagGroup: OptionGroup = { id: 'tags', label: 'Tag', mode: 'multi', options: tags };

    return [tags.length ? [typeGroup, tagGroup] : [typeGroup], [TARGET_GROUP]];
  });

  protected isSelected(group: OptionGroup, option: string) {
    const current = this.value()[group.id];
    return Array.isArray(current) ? (current as string[]).includes(option) : current === option;
  }

  protected pillClass(group: OptionGroup, option: string, selected: boolean) {
    const shape =
      group.id === 'target'
        ? 'min-h-9 rounded-full px-3 py-1 text-xs font-semibold'
        : 'min-h-9 rounded-lg pl-3 pr-4 text-sm font-semibold';

    if (this.colors[option]) {
      return `${shape} bg-[var(--fill)] text-[var(--ink)] ${
        selected
          ? 'border-[var(--fill)] ring-2 ring-inset ring-[var(--ink)] font-bold'
          : 'border-[var(--edge)]'
      }`;
    }

    // Targets (no color config): the white fill is already the selected signal
    return `${shape} ${
      selected
        ? 'border-white bg-white text-black font-bold'
        : 'border-neutral-500 bg-neutral-800 text-white'
    }`;
  }
  protected choose(group: OptionGroup, option: string) {
    this.value.update((v) => {
      switch (group.id) {
        case 'target':
          return normalizeOptions({ ...v, target: option as ActionTarget });
        case 'type':
          return normalizeOptions({ ...v, type: option as ActionType });
        case 'tags': {
          const tag = option as ActionTag;
          const tags = v.tags.includes(tag) ? v.tags.filter((t) => t !== tag) : [...v.tags, tag];
          return normalizeOptions({ ...v, tags });
        }
      }
    });
  }
}
