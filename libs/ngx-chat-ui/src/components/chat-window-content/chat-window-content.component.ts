// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import type { ChatService, FileUploadHandler, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Contact, ContactSubscription } from '@pazznetwork/ngx-chat-shared';
import { ChatWindowInputComponent } from '../chat-window-input';
import { ChatHistoryComponent } from '../chat-history';
import { CommonModule } from '@angular/common';
import { ChatFileDropComponent } from '../chat-file-drop';
import {
  CHAT_SERVICE_TOKEN,
  FILE_UPLOAD_HANDLER_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';
import { combineLatest, map, Observable, of, Subject } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
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

          // none and undefined no longer checked for pazz
          return isNotBlocked && ContactSubscription.from === subscription;
        })
      );
    } else {
      this.pendingRequest$ = of(false);
    }
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }
}
