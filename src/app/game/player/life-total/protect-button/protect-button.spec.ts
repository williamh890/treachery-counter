import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectButton } from './protect-button';

describe('ProtectButton', () => {
  let component: ProtectButton;
  let fixture: ComponentFixture<ProtectButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectButton],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
