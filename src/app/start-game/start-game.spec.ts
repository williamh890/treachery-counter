import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartGame } from './start-game';

describe('StartGame', () => {
  let component: StartGame;
  let fixture: ComponentFixture<StartGame>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartGame],
    }).compileComponents();

    fixture = TestBed.createComponent(StartGame);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
