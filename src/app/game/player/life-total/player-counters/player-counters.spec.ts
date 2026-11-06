import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCounters } from './player-counters';

describe('PlayerCounters', () => {
  let component: PlayerCounters;
  let fixture: ComponentFixture<PlayerCounters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCounters],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCounters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
