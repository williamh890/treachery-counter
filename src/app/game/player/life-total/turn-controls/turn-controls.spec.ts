import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnControls } from './turn-controls';

describe('TurnControls', () => {
  let component: TurnControls;
  let fixture: ComponentFixture<TurnControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnControls],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnControls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
