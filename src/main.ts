import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { installTapFix } from './tap-fix';

installTapFix();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
