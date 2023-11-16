// SPDX-License-Identifier: AGPL-3.0-or-later
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IndexComponent } from './routes/index/index.component';
import { StanzaComponent } from './components/stanza/stanza.component';
import { MucComponent } from './components/muc/muc.component';
import { NgModule } from '@angular/core';
import { ChatWindowComponent, NgxChatModule } from '@pazznetwork/ngx-chat';
import { UiComponent } from './routes/ui/ui.component';
import { ContactManagementComponent } from './components/contact-management/contact-management.component';
import { CUSTOM_CONTACT_FACTORY_TOKEN, CUSTOM_ROOM_FACTORY_TOKEN } from '@pazznetwork/ngx-xmpp';
import { CustomContact } from './service/custom-contact';
import { CustomRoom } from './service/custom-room';
import { USER_AVATAR_TOKEN } from '../../../../libs/ngx-xmpp/src/injection-token/user-avatar.token';
import { of, shareReplay } from 'rxjs';
import { dummyAvatar } from './service/dummy-avatar';

@NgModule({
  declarations: [
    AppComponent,
    IndexComponent,
    StanzaComponent,
    MucComponent,
    UiComponent,
    ContactManagementComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    NgxChatModule,
    ChatWindowComponent,
  ],
  providers: [
    { provide: CUSTOM_CONTACT_FACTORY_TOKEN, useClass: CustomContact },
    { provide: CUSTOM_ROOM_FACTORY_TOKEN, useClass: CustomRoom },
    {
      provide: USER_AVATAR_TOKEN,
      useFactory: () => of(dummyAvatar).pipe(shareReplay({ bufferSize: 1, refCount: true })),
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
