import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionOptions } from './action-options';

describe('ActionOptions', () => {
  let component: ActionOptions;
  let fixture: ComponentFixture<ActionOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionOptions],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionOptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
