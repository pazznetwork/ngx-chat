// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import type { ChatService, FileUploadHandler, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Contact, ContactSubscription } from '@pazznetwork/ngx-chat-shared';
import { ChatWindowInputComponent } from '../chat-window-input';
import { ChatHistoryComponent } from '../chat-history';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ChatFileDropComponent } from '../chat-file-drop';
import {
  CHAT_SERVICE_TOKEN,
  FILE_UPLOAD_HANDLER_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import { combineLatest, map, Observable, of, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
    AsyncPipe,
    ChatFileDropComponent,
    ChatHistoryComponent,
    ChatWindowInputComponent,
  ],
  selector: 'ngx-chat-window-content',
  templateUrl: './chat-window-content.component.html',
  styleUrls: ['./chat-window-content.component.less'],
})
export class ChatWindowContentComponent implements OnInit, OnDestroy {
  @Input()
  recipient?: Recipient;

  @Input()
  showAvatars = true;

  @ViewChild(ChatWindowInputComponent)
  readonly messageInput?: ChatWindowInputComponent;

  private readonly scheduleScrollToBottomSubject = new Subject<void>();
  readonly scheduleScrollToBottom$ = this.scheduleScrollToBottomSubject.asObservable();

  pendingRequest$!: Observable<boolean>;

  private ngDestroySubject = new Subject<void>();

  get asContact(): Contact | undefined {
    return this.recipient instanceof Contact ? this.recipient : undefined;
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(FILE_UPLOAD_HANDLER_TOKEN) readonly fileUploadHandler: FileUploadHandler
  ) {}

  async uploadFile(file: File): Promise<void> {
    if (!this.recipient) {
      return;
    }
    const url = await this.fileUploadHandler.upload(file);
    await this.chatService.messageService.sendMessage(this.recipient, url);
  }

  afterSendMessage(): void {
    this.scheduleScrollToBottomSubject.next();
  }

  onFocus(): void {
    this.messageInput?.focus();
  }

  ngOnInit(): void {
    if (this.recipient instanceof Contact) {
      this.pendingRequest$ = combineLatest([
        this.chatService.contactListService.contactsBlocked$,
        this.recipient.subscription$,
      ]).pipe(
        map(([blockedContacts, subscription]) => {
          const isNotBlocked = !blockedContacts.find((b) =>
            b.jid.bare().equals(this.recipient?.jid.bare())
          );
          const isNotContact = ![(ContactSubscription.both, ContactSubscription.to)].includes(
            subscription
          );

          return isNotBlocked && isNotContact;
        })
      );
      this.pendingRequest$
        .pipe(
          filter((val) => val),
          takeUntil(this.ngDestroySubject)
        )
        .subscribe(() => this.scheduleScrollToBottomSubject.next());
    } else {
      this.pendingRequest$ = of(false);
    }
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }
}
