import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeckSelect } from './deck-select';

describe('DeckSelect', () => {
  let component: DeckSelect;
  let fixture: ComponentFixture<DeckSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeckSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(DeckSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
