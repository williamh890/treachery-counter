import { Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginBtn } from './login-btn/login-btn';
import { Header } from './header/header';


@Component({
  imports: [RouterOutlet, LoginBtn, Header],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {

}
