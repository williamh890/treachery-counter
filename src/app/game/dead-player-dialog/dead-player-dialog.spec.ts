import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeadPlayerDialog } from './dead-player-dialog';

describe('DeadPlayerDialog', () => {
  let component: DeadPlayerDialog;
  let fixture: ComponentFixture<DeadPlayerDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeadPlayerDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(DeadPlayerDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
