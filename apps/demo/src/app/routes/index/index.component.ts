// SPDX-License-Identifier: AGPL-3.0-or-later
/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
import 'zone.js/plugins/task-tracking';
import { Component, Inject, NgZone, OnDestroy } from '@angular/core';
import { firstValueFrom, map, merge, Observable, startWith, Subject } from 'rxjs';
import {
  AuthRequest,
  ChatService,
  Log,
  LOG_SERVICE_TOKEN,
  LogLevel,
} from '@pazznetwork/ngx-chat-shared';
import { takeUntil } from 'rxjs/operators';
import {
  CHAT_SERVICE_TOKEN,
  ChatBackgroundNotificationService,
  ChatListStateService,
} from '@pazznetwork/ngx-xmpp';
import { XmppService } from '@pazznetwork/xmpp-adapter';
import { cleanUpJabber } from '../../../../../../libs/ngx-xmpp/src/test/helpers/ejabberd-client';

@Component({
  selector: 'ngx-chat-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css'],
})
export class IndexComponent implements OnDestroy {
  domain = '';
  service = '';
  password = '';
  username = '';
  otherJid = '';
  private readonly registrationMessageSubject = new Subject<string>();
  registrationMessage$: Observable<string> = this.registrationMessageSubject.asObservable();

  private readonly ngDestroySubject = new Subject<void>();
  state$: Observable<string>;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(LOG_SERVICE_TOKEN) readonly logService: Log,
    private chatListStateService: ChatListStateService,
    private readonly ngZone: NgZone,
    private readonly chatBackgroundNotificationService: ChatBackgroundNotificationService
  ) {
    const item = localStorage.getItem('data');
    const contactData: {
      domain: string;
      service: string;
      password: string;
      username: string;
    } = item ? JSON.parse(item) : { domain: '', password: '', service: '', username: '' };
    this.logService.logLevel = LogLevel.Debug;
    this.domain = contactData.domain;
    this.service = contactData.service;
    this.password = contactData.password;
    this.username = contactData.username;

    this.state$ = merge(
      chatService.onOnline$.pipe(map(() => 'online')),
      chatService.onOffline$.pipe(map(() => 'offline')),
      chatService.onAuthenticating$.pipe(map(() => 'connecting'))
    ).pipe(startWith('offline'));

    this.state$
      .pipe(takeUntil(this.ngDestroySubject))
      .subscribe((state) =>
        IndexComponent.stateChanged(state as 'offline' | 'connecting' | 'online')
      );
  }

  private static stateChanged(state: 'offline' | 'connecting' | 'online'): void {
    // eslint-disable-next-line no-console
    console.log('state changed!', state);
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }

  async chatBackgroundNotificationServiceEnable(): Promise<void> {
    await this.chatBackgroundNotificationService.enable();
  }

  watchAngularStability(): void {
    this.ngZone.onUnstable.pipe(takeUntil(this.ngDestroySubject)).subscribe(() => {
      this.ngZone.runOutsideAngular(() => {
        // Access the NgZone's internals - TaskTrackingZone:

        const taskTrackingZone = (this.ngZone as any)._inner.getZoneWith('TaskTrackingZone')
          ._properties.TaskTrackingZone;

        // console.log("TaskTrackingZone", TaskTrackingZone);
        // Print to the console all pending tasks
        // (micro tasks, macro tasks and event listeners):
        // console.log('👀 Pending tasks in NgZone: 👀');
        // eslint-disable-next-line no-console
        console.log({
          microTasks: taskTrackingZone.getTasksFor('microTask'),
          macroTasks: taskTrackingZone.getTasksFor('macroTask'),
          eventTasks: taskTrackingZone
            .getTasksFor('eventTask')
            .filter((task: { eventName: string }) => task.eventName !== 'click'),
        });
      });
    });
  }

  async onLogin(): Promise<void> {
    const logInRequest: AuthRequest = {
      domain: this.domain,
      service: this.service,
      password: this.password,
      username: this.username,
    };
    localStorage.setItem('data', JSON.stringify(logInRequest));
    await this.chatService.logIn(logInRequest);
  }

  async logWebstream(): Promise<void> {
    const xmppChat = this.chatService as XmppService;
    const connection = await firstValueFrom(xmppChat.chatConnectionService.connection$);
    // eslint-disable-next-line no-console
    console.log('webstream', connection.debugLog);
  }

  async onLogout(): Promise<void> {
    await this.chatService.logOut();
  }

  async onRegister(): Promise<void> {
    this.registrationMessageSubject.next('registering ...');
    if (!this.username) {
      throw new Error(`this.username is undefined`);
    }
    if (!this.password) {
      throw new Error(`this.password is undefined`);
    }
    try {
      await this.chatService.register({
        username: this.username,
        password: this.password,
        service: this.service,
        domain: this.domain,
      });
      this.registrationMessageSubject.next(`${this.username} registration was successful`);
    } catch (e) {
      if (e instanceof Error) {
        this.registrationMessageSubject.next(`registration failed: ${e?.toString()}`);
      }
      throw e;
    }
  }

  async onAddContact(): Promise<void> {
    if (!this.otherJid) {
      throw new Error(`this.otherJid is undefined`);
    }
    if (!this.domain) {
      throw new Error(`this.domain is undefined`);
    }
    const jid = this.otherJid?.includes('@') ? this.otherJid : this.otherJid + '@' + this.domain;
    await this.chatService.contactListService.addContact(jid);
  }

  async onRemoveContact(): Promise<void> {
    if (!this.otherJid) {
      throw new Error(`this.otherJid is undefined`);
    }
    if (!this.domain) {
      throw new Error(`this.domain is undefined`);
    }
    const jid = this.otherJid?.includes('@') ? this.otherJid : this.otherJid + '@' + this.domain;
    await this.chatService.contactListService.removeContact(jid);
  }

  async onOpenChat(): Promise<void> {
    if (!this.otherJid) {
      throw new Error(`this.otherJid is undefined`);
    }
    if (!this.domain) {
      throw new Error(`this.domain is undefined`);
    }
    const jid = this.otherJid?.includes('@') ? this.otherJid : this.otherJid + '@' + this.domain;
    this.chatListStateService.openChat(
      await this.chatService.contactListService.getOrCreateContactById(jid)
    );
  }

  async onReconnect(): Promise<void> {
    await this.chatService.reconnect();
  }

  async blockContact(): Promise<void> {
    await this.chatService.contactListService.blockJid(this.otherJid);
  }

  async unblockContact(): Promise<void> {
    await this.chatService.contactListService.unblockJid(this.otherJid);
  }

  async onUnregister(): Promise<void> {
    await this.chatService.unregister({
      domain: this.domain,
      service: this.service,
    });
  }

  cleanUpJabber(): Promise<void> {
    return cleanUpJabber();
  }
}
