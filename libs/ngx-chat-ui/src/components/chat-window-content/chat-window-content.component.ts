// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, ViewChild } from '@angular/core';
import type { ChatService, FileUploadHandler, Recipient } from '@pazznetwork/ngx-chat-shared';
import { ChatWindowInputComponent } from '../chat-window-input';
import { ChatHistoryComponent } from '../chat-history';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ChatFileDropComponent } from '../chat-file-drop';
import {
  CHAT_SERVICE_TOKEN,
  FILE_UPLOAD_HANDLER_TOKEN,
  XmppAdapterModule,
} from '@pazznetwork/ngx-xmpp';

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
export class ChatWindowContentComponent {
  @Input()
  recipient?: Recipient;

  @ViewChild(ChatWindowInputComponent)
  readonly messageInput?: ChatWindowInputComponent;

  @ViewChild(ChatHistoryComponent)
  readonly contactMessageList?: ChatHistoryComponent;

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
    this.contactMessageList?.scheduleScrollToLastMessage();
  }

  onFocus(): void {
    this.messageInput?.focus();
  }
}
