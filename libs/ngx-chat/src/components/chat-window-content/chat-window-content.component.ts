// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, ViewChild } from '@angular/core';
import type { ChatService, FileUploadHandler, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Contact, ContactSubscription } from '@pazznetwork/ngx-chat-shared';
import { ChatWindowInputComponent } from '../chat-window-input';
import { ChatHistoryComponent } from '../chat-history';
import { CommonModule } from '@angular/common';
import { ChatFileDropComponent } from '../chat-file-drop';
import { CHAT_SERVICE_TOKEN, FILE_UPLOAD_HANDLER_TOKEN } from '@pazznetwork/ngx-xmpp';
import { combineLatest, map, Observable, of, startWith } from 'rxjs';

@Component({
    imports: [CommonModule, ChatFileDropComponent, ChatHistoryComponent, ChatWindowInputComponent],
    selector: 'ngx-chat-window-content',
    templateUrl: './chat-window-content.component.html',
    styleUrls: ['./chat-window-content.component.less']
})
export class ChatWindowContentComponent {
  currentRecipient!: Recipient;

  @Input()
  set recipient(value: Recipient) {
    if (value instanceof Contact) {
      this.pendingRequest$ = combineLatest([
        this.chatService.contactListService.contactsBlocked$.pipe(startWith([])),
        value.subscription$,
      ]).pipe(
        map(([blockedContacts, subscription]) => {
          const isNotBlocked = !blockedContacts.find((b) => b.jid.bare().equals(value?.jid.bare()));
          return isNotBlocked &&
            (ContactSubscription.from === subscription || ContactSubscription.none === subscription);
        })
      );
    } else {
      this.pendingRequest$ = of(false);
    }

    this.currentRecipient = value;
  }

  @Input()
  showAvatars = true;

  @ViewChild(ChatWindowInputComponent)
  readonly messageInput?: ChatWindowInputComponent;

  pendingRequest$!: Observable<boolean>;

  get asContact(): Contact | undefined {
    return this.currentRecipient instanceof Contact ? this.currentRecipient : undefined;
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(FILE_UPLOAD_HANDLER_TOKEN) readonly fileUploadHandler: FileUploadHandler
  ) { }

  async uploadFile(file: File): Promise<void> {
    if (!this.currentRecipient) {
      return;
    }
    const url = await this.fileUploadHandler.upload(file);
    await this.chatService.messageService.sendMessage(this.currentRecipient, url);
  }

  onFocus(): void {
    this.messageInput?.focus();
  }
}
