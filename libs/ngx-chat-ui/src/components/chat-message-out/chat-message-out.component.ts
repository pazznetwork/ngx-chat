// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnInit } from '@angular/core';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';
import { Message, MessageState, parseJid } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { ChatBubbleComponent } from '../chat-bubble';
import { ChatBubbleAvatarComponent } from '../chat-bubble-avatar';
import { ChatMessageTextAreaComponent } from '../chat-message-text-area';
import { ChatMessageImageComponent } from '../chat-message-image';
import { ChatBubbleFooterComponent } from '../chat-bubble-footer';
import { ChatMessageStateIconComponent } from '../chat-message-state-icon';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    XmppAdapterModule,
    ChatBubbleComponent,
    ChatBubbleAvatarComponent,
    ChatMessageTextAreaComponent,
    ChatMessageImageComponent,
    ChatBubbleFooterComponent,
    ChatMessageStateIconComponent,
  ],
  selector: 'ngx-chat-message-out',
  templateUrl: './chat-message-out.component.html',
  styleUrls: ['./chat-message-out.component.less'],
})
export class ChatMessageOutComponent implements OnInit {
  @Input()
  showAvatar = true;

  @Input()
  message: Message | undefined;

  nick$?: Observable<string | undefined>;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {}

  ngOnInit(): void {
    this.nick$ = this.chatService.userName$.pipe(
      switchMap((userName) => {
        if (userName === '') {
          return this.chatService.userJid$.pipe(map((jid) => parseJid(jid).local));
        }
        return of(userName);
      })
    );
  }

  // TODO: check if message.state can be ensured so this method can be removed
  getMessageState(): MessageState {
    return MessageState.UNKNOWN;
    /*if (this.message?.state) {
      return this.message.state;
    } else if (this.contact && this.message) {
      return this.chatService.messageService.getContactMessageState(
        this.message,
        this.contact.jid.toString()
      );
    }
    return MessageState.HIDDEN;*/
  }
}
