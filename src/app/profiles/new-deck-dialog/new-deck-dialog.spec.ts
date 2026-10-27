import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewDeckDialog } from './new-deck-dialog';

describe('NewDeckDialog', () => {
  let component: NewDeckDialog;
  let fixture: ComponentFixture<NewDeckDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewDeckDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(NewDeckDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
