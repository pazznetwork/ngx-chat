import {
  ApplicationConfig,
  EnvironmentProviders,
  importProvidersFrom,
  makeEnvironmentProviders,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import { IndexComponent } from './routes/index/index.component';
import { UiComponent } from './routes/ui/ui.component';
import {
  CUSTOM_CONTACT_FACTORY_TOKEN,
  CUSTOM_ROOM_FACTORY_TOKEN,
  USER_AVATAR_TOKEN,
} from '@pazznetwork/ngx-xmpp';
import { CustomContact } from './service/custom-contact';
import { CustomRoom } from './service/custom-room';
import { of, shareReplay } from 'rxjs';
import { dummyAvatar } from './service/dummy-avatar';
import { NgxChatModule } from '@pazznetwork/ngx-chat';

const routes: Routes = [
  { path: '', component: IndexComponent },
  { path: 'ui', component: UiComponent },
  { path: '**', redirectTo: '/' },
];

function provideNgxChat(): EnvironmentProviders {
  return makeEnvironmentProviders([
    importProvidersFrom(NgxChatModule),
    {
      provide: CUSTOM_CONTACT_FACTORY_TOKEN,
      useClass: CustomContact,
    },
    { provide: CUSTOM_ROOM_FACTORY_TOKEN, useClass: CustomRoom },
    {
      provide: USER_AVATAR_TOKEN,
      useFactory: () => of(dummyAvatar).pipe(shareReplay({ bufferSize: 1, refCount: true })),
    },
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [provideAnimations(), provideRouter(routes), provideNgxChat()],
};
