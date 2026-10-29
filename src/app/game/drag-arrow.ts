import { Component, computed, input } from '@angular/core';

export interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-drag-arrow',
  template: `
    @if (path(); as d) {
      <svg
        class="pointer-events-none fixed inset-0 z-50 h-full w-full drop-shadow-lg transition-opacity duration-150"
        [class.opacity-0]="fading()"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="drag-arrowhead"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="white" />
          </marker>
        </defs>
        <path
          [attr.d]="d"
          fill="none"
          stroke="white"
          stroke-width="6"
          stroke-linecap="round"
          marker-end="url(#drag-arrowhead)"
        />
      </svg>
    }
  `,
})
export class DragArrow {
  start = input.required<Point>();
  end = input.required<Point>();
  fading = input(false);

  /** Quadratic curve from start to end, bulging to one side of the line. */
  path = computed(() => {
    const s = this.start();
    const e = this.end();
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    const bulge = Math.min(len * 0.3, 140);
    const cx = (s.x + e.x) / 2 + (dy / len) * bulge;
    const cy = (s.y + e.y) / 2 - (dx / len) * bulge;

    return `M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`;
  });
}
