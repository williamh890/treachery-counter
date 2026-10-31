import { Routes } from '@angular/router';

import { Home } from './home/home';
import { Game } from './game/game';
import { Profiles } from './profiles/profiles';
import { StartGame } from './start-game/start-game';
import { Groups } from './profiles/groups/groups';


export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, title: 'Treachery Counter' },
  { path: 'start-game', component: StartGame, title: 'Start Game' },
  { path: 'game', component: Game, title: 'Treachery' },
  {
    path: 'profiles',
    children: [
      { path: '', component: Profiles, title: 'Treachery Profiles' },
      { path: 'groups', component: Groups, title: 'Treachery Groups' },
    ],
  },
];
