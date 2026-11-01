import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LifeTotal } from './life-total';

describe('LifeTotal', () => {
  let component: LifeTotal;
  let fixture: ComponentFixture<LifeTotal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifeTotal],
    }).compileComponents();

    fixture = TestBed.createComponent(LifeTotal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
