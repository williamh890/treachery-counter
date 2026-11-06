import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameOptionsDialog } from './game-options-dialog';

describe('GameOptionsDialog', () => {
  let component: GameOptionsDialog;
  let fixture: ComponentFixture<GameOptionsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameOptionsDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(GameOptionsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
