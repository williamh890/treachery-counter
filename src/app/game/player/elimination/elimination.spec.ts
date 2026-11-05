import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Elimination } from './elimination';

describe('Elimination', () => {
  let component: Elimination;
  let fixture: ComponentFixture<Elimination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Elimination],
    }).compileComponents();

    fixture = TestBed.createComponent(Elimination);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
