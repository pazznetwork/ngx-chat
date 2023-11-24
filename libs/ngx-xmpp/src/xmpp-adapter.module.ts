// SPDX-License-Identifier: AGPL-3.0-or-later
import { NgModule, NgZone } from '@angular/core';
import {
  ChatBackgroundNotificationService,
  ChatListStateService,
  ChatMessageListRegistryService,
  LogService,
} from './services';
import type {
  ChatService,
  CustomContactFactory,
  CustomRoomFactory,
  FileUploadHandler,
  Log,
} from '@pazznetwork/ngx-chat-shared';
import { LOG_SERVICE_TOKEN } from '@pazznetwork/ngx-chat-shared';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DefaultContactFactory, DefaultRoomFactory, XmppService } from '@pazznetwork/xmpp-adapter';
import {
  CHAT_SERVICE_TOKEN,
  CUSTOM_CONTACT_FACTORY_TOKEN,
  CUSTOM_ROOM_FACTORY_TOKEN,
  FILE_UPLOAD_HANDLER_TOKEN,
  OPEN_CHAT_SERVICE_TOKEN,
} from './injection-token';
import { NEVER, Observable, of } from 'rxjs';
import { USER_AVATAR_TOKEN } from './injection-token/user-avatar.token';
import { USER_NAME_TOKEN } from './injection-token/user-name.token';

@NgModule({
  imports: [HttpClientModule],
  providers: [
    ChatBackgroundNotificationService,
    ChatListStateService,
    {
      provide: OPEN_CHAT_SERVICE_TOKEN,
      useClass: ChatMessageListRegistryService,
    },
    {
      provide: LOG_SERVICE_TOKEN,
      useClass: LogService,
    },
    { provide: CUSTOM_CONTACT_FACTORY_TOKEN, useClass: DefaultContactFactory },
    { provide: CUSTOM_ROOM_FACTORY_TOKEN, useClass: DefaultRoomFactory },
    // eslint-disable-next-line rxjs/finnish
    { provide: USER_AVATAR_TOKEN, useValue: NEVER },
    { provide: USER_NAME_TOKEN, useValue: of('') },
    {
      provide: CHAT_SERVICE_TOKEN,
      deps: [
        NgZone,
        HttpClient,
        USER_AVATAR_TOKEN,
        USER_NAME_TOKEN,
        OPEN_CHAT_SERVICE_TOKEN,
        LOG_SERVICE_TOKEN,
        CUSTOM_ROOM_FACTORY_TOKEN,
        CUSTOM_CONTACT_FACTORY_TOKEN,
      ],
      useFactory: XmppAdapterModule.xmppServiceFactory,
    },
    {
      provide: FILE_UPLOAD_HANDLER_TOKEN,
      deps: [CHAT_SERVICE_TOKEN],
      useFactory: XmppAdapterModule.fileUploadHandlerFactory,
    },
  ],
})
export class XmppAdapterModule {
  private static fileUploadHandlerFactory(chatService: ChatService): FileUploadHandler {
    return chatService.fileUploadHandler;
  }

  private static xmppServiceFactory(
    zone: NgZone,
    httpClient: HttpClient,
    userAvatar$: Observable<string>,
    userName$: Observable<string>,
    chatMessageListRegistryService: ChatMessageListRegistryService,
    logService: Log,
    customRoomFactory: CustomRoomFactory,
    customContactFactory: CustomContactFactory
  ): XmppService {
    return zone.runOutsideAngular(() =>
      XmppService.create(
        zone,
        logService,
        userAvatar$,
        userName$,
        chatMessageListRegistryService,
        httpClient,
        customRoomFactory,
        customContactFactory
      )
    );
  }
}
