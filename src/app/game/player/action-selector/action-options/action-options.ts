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
  imports: [OptionIcon],
  template: `
    <div class="flex flex-col items-center gap-[3cqmin] px-[3cqmin] py-[2cqmin]">
      @for (row of rows(); track $index) {
        <div class="flex flex-wrap justify-center gap-[2.5cqmin]">
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
                  <!-- Icon slot: same size in every state, so nothing shifts -->
                  <span class="size-[1.4em] shrink-0" aria-hidden="true">
                    <app-option-icon [name]="option" />
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
    const { target, type, tags: selectedTags } = this.value();

    const typeGroup: OptionGroup = {
      id: 'type',
      label: 'Type',
      mode: 'single',
      // With Commander toggled, only the damage types are offered
      options: availableTypes(target, selectedTags),
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
    const size = 'min-h-[clamp(1.75rem,11cqmin,3.5rem)] text-[clamp(0.625rem,4cqmin,1.125rem)]';
    const shape =
      group.id === 'target'
        ? `${size} rounded-full px-[3.5cqmin] py-0.5 font-semibold`
        : `${size} rounded-lg pl-[3cqmin] pr-[4cqmin] font-semibold`;

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

  protected asTarget(option: string): ActionTarget {
    return option as ActionTarget;
  }
}
