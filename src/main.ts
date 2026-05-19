import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
