import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { App } from './app/app';

/** Uygulamanın giriş noktası: kök bileşeni index.html'deki <app-root> içine bağlar. */
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
