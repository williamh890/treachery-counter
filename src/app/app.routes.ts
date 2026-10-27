import { Routes } from '@angular/router';

import { Home } from './home/home';
import { Game } from './game/game';
import { Profiles } from './profiles/profiles';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, title: 'Treachery Counter'},
  { path: 'game', component: Game, title: 'Treachery'},
  { path: 'profiles', component: Profiles, title: 'Treachery Profiles'}
];
