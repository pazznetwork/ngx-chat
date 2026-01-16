import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { NgxChatModule } from '@pazznetwork/ngx-chat';
import { REPORT_USER_INJECTION_TOKEN } from '@pazznetwork/ngx-xmpp';

import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideAnimations(),
    importProvidersFrom(NgxChatModule),
    {
      provide: REPORT_USER_INJECTION_TOKEN,
      useValue: {
        reportUser: () => {
          alert('report user');
        }
      }
    }
  ],
};
