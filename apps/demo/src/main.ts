// SPDX-License-Identifier: AGPL-3.0-or-later
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  // eslint-disable-next-line no-console
  .catch((err) => console.log(err));
