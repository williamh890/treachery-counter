import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionSelector } from './action-selector';

describe('ActionSelector', () => {
  let component: ActionSelector;
  let fixture: ComponentFixture<ActionSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionSelector],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
