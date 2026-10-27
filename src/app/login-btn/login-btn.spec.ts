import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginBtn } from './login-btn';

describe('LoginBtn', () => {
  let component: LoginBtn;
  let fixture: ComponentFixture<LoginBtn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginBtn],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginBtn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
