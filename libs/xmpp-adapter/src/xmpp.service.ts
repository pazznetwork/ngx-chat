// SPDX-License-Identifier: MIT
import { firstValueFrom, Observable, Subject, tap } from 'rxjs';
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
import { NgZone } from '@angular/core';

export class XmppService implements ChatService {
  static instance: XmppService;

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

  private constructor(
    readonly zone: NgZone,
    readonly log: Log,
    openChatsService: OpenChatsService,
    httpClient: HttpClient
  ) {
    this.chatConnectionService = new XmppConnectionService(log);

    this.onAuthenticating$ = this.chatConnectionService.onAuthenticating$;
    this.onOnline$ = this.chatConnectionService.onOnline$;
    this.onOffline$ = this.chatConnectionService.onOffline$;
    this.isOnline$ = this.chatConnectionService.isOnline$;
    this.isOffline$ = this.chatConnectionService.isOffline$;
    this.userJid$ = this.chatConnectionService.userJid$.pipe(
      tap((value) => console.log('UserJID Emit', value))
    );

    this.pluginMap = createPluginMap(this, httpClient, log, openChatsService);

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

  static create(
    zone: NgZone,
    log: Log,
    openChatsService: OpenChatsService,
    httpClient: HttpClient
  ): XmppService {
    if (XmppService.instance) {
      return XmppService.instance;
    }
    XmppService.instance = new XmppService(zone, log, openChatsService, httpClient);
    return XmppService.instance;
  }

  async logIn(logInRequest: AuthRequest): Promise<void> {
    if (await firstValueFrom(this.isOnline$)) {
      return;
    }

    await this.zone.runOutsideAngular(async () => {
      this.lastLogInRequest = logInRequest;
      const onOnlinePromise = firstValueFrom(this.onOnline$);
      await this.chatConnectionService.logIn(logInRequest);
      await onOnlinePromise;
      await this.pluginMap.disco.ensureServicesAreDiscovered(logInRequest.domain);
      await firstValueFrom(this.pluginMap.disco.servicesInitialized$);
      // redundant because default type is available, but better for documentation purposes
      await this.chatConnectionService.$pres({ type: 'available' }).sendResponseLess();
    });
  }

  async logOut(): Promise<void> {
    await this.zone.runOutsideAngular(async () => {
      const offlinePromise = firstValueFrom(this.onOffline$);
      await this.chatConnectionService.logOut();
      await offlinePromise;
    });
  }

  async reconnect(): Promise<void> {
    return this.zone.runOutsideAngular(async () => {
      if (!this.lastLogInRequest) {
        return;
      }
      return this.logIn(this.lastLogInRequest);
    });
  }

  async register(authRequest: AuthRequest): Promise<void> {
    return this.zone.runOutsideAngular(async () => {
      const onOnlinePromise = firstValueFrom(this.onOnline$);
      await this.chatConnectionService.register(authRequest);
      await onOnlinePromise;
      await this.pluginMap.disco.ensureServicesAreDiscovered(authRequest.domain);
    });
  }

  async unregister(authRequest: Pick<AuthRequest, 'service' | 'domain'>): Promise<void> {
    return this.zone.runOutsideAngular(async () => {
      await this.chatConnectionService.unregister(authRequest);
    });
  }
}
