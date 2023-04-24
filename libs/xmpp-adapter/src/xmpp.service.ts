// SPDX-License-Identifier: MIT
import { firstValueFrom, Observable, Subject } from 'rxjs';
import type {
  AuthRequest,
  ChatService,
  FileUploadHandler,
  Log,
  OpenChatsService,
  Translations,
} from '@pazznetwork/ngx-chat-shared';
import { defaultTranslations } from '@pazznetwork/ngx-chat-shared';
import type { HttpClient } from '@angular/common/http';
import {
  XmppConnectionService,
  XmppContactListService,
  XmppMessageService,
  XmppRoomService,
} from './service';
import type { PluginMap } from './core';
import { createPluginMap } from './core';

export class XmppService implements ChatService {
  readonly chatConnectionService: XmppConnectionService;

  readonly onAuthenticating$: Observable<void>;
  readonly onOnline$: Observable<void>;
  readonly onOffline$: Observable<void>;
  readonly isOnline$: Observable<boolean>;
  readonly isOffline$: Observable<boolean>;

  readonly userJid$: Observable<string>;

  readonly pluginMap: PluginMap;

  readonly userAvatar$: Observable<string> = new Subject();
  translations: Translations = defaultTranslations();

  readonly fileUploadHandler: FileUploadHandler;

  private lastLogInRequest?: AuthRequest;

  messageService: XmppMessageService;
  roomService: XmppRoomService;
  contactListService: XmppContactListService;

  constructor(logService: Log, openChatsService: OpenChatsService, httpClient: HttpClient) {
    this.chatConnectionService = new XmppConnectionService(logService);

    this.onAuthenticating$ = this.chatConnectionService.onAuthenticating$;
    this.onOnline$ = this.chatConnectionService.onOnline$;
    this.onOffline$ = this.chatConnectionService.onOffline$;
    this.isOnline$ = this.chatConnectionService.isOnline$;
    this.isOffline$ = this.chatConnectionService.isOffline$;
    this.userJid$ = this.chatConnectionService.userJid$;

    this.pluginMap = createPluginMap(this, httpClient, logService, openChatsService);

    this.messageService = new XmppMessageService(
      this,
      this.pluginMap.mam,
      this.pluginMap.muc,
      // this.pluginMap.messageState,
      this.pluginMap.messageCarbon,
      this.pluginMap.unreadMessageCount
    );
    this.roomService = new XmppRoomService(this.pluginMap.muc, this.pluginMap.mucSub);
    this.contactListService = new XmppContactListService(
      this.pluginMap.roster,
      this.pluginMap.block
    );

    this.fileUploadHandler = this.pluginMap.xmppFileUpload;

    this.onOffline$.subscribe(() => this.pluginMap.disco.clearDiscovered());
  }

  async logIn(logInRequest: AuthRequest): Promise<void> {
    if (await firstValueFrom(this.isOnline$)) {
      return;
    }
    this.lastLogInRequest = logInRequest;
    const onOnlinePromise = firstValueFrom(this.onOnline$);
    await this.chatConnectionService.logIn(logInRequest);
    await onOnlinePromise;
    await this.pluginMap.disco.ensureServicesAreDiscovered(logInRequest.domain);
    await firstValueFrom(this.pluginMap.disco.servicesInitialized$);
    // redundant because default type is available, but better for documentation purposes
    await this.chatConnectionService.$pres({ type: 'available' }).sendResponseLess();
  }

  async logOut(): Promise<void> {
    const offlinePromise = firstValueFrom(this.onOffline$);
    await this.chatConnectionService.logOut();
    await offlinePromise;
  }

  async reconnect(): Promise<void> {
    if (!this.lastLogInRequest) {
      return;
    }
    return this.logIn(this.lastLogInRequest);
  }

  async register(authRequest: AuthRequest): Promise<void> {
    const onOnlinePromise = firstValueFrom(this.onOnline$);
    await this.chatConnectionService.register(authRequest);
    await onOnlinePromise;
    await this.pluginMap.disco.ensureServicesAreDiscovered(authRequest.domain);
  }

  async unregister(authRequest: Pick<AuthRequest, 'service' | 'domain'>): Promise<void> {
    await this.chatConnectionService.unregister(authRequest);
  }
}
