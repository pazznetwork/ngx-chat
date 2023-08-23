// SPDX-License-Identifier: AGPL-3.0-or-later
import { NgModule, NgZone } from '@angular/core';
import {
  ChatBackgroundNotificationService,
  ChatListStateService,
  ChatMessageListRegistryService,
  LogService,
} from './services';
import type { ChatService, FileUploadHandler, Log } from '@pazznetwork/ngx-chat-shared';
import { LOG_SERVICE_TOKEN } from '@pazznetwork/ngx-chat-shared';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { XmppService } from '@pazznetwork/xmpp-adapter';
import {
  CHAT_SERVICE_TOKEN,
  FILE_UPLOAD_HANDLER_TOKEN,
  OPEN_CHAT_SERVICE_TOKEN,
} from './injection-token';

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
    {
      provide: CHAT_SERVICE_TOKEN,
      deps: [NgZone, HttpClient, OPEN_CHAT_SERVICE_TOKEN, LOG_SERVICE_TOKEN],
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
    chatMessageListRegistryService: ChatMessageListRegistryService,
    logService: Log
  ): XmppService {
    return zone.runOutsideAngular(
      () => new XmppService(logService, chatMessageListRegistryService, httpClient)
    );
  }
}
