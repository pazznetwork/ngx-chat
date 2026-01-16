// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, EventEmitter, Inject, Input, Optional, Output } from '@angular/core';
import { CHAT_SERVICE_TOKEN, CONTACT_CLICK_HANDLER_TOKEN } from '@pazznetwork/ngx-xmpp';
import type { ChatContactClickHandler, ChatService } from '@pazznetwork/ngx-chat-shared';
import { Contact, isContact, Recipient } from '@pazznetwork/ngx-chat-shared';
import { ChatAvatarComponent } from '../chat-avatar';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    imports: [CommonModule, ChatAvatarComponent],
    selector: 'ngx-chat-window-header',
    templateUrl: './chat-window-header.component.html',
    styleUrls: ['./chat-window-header.component.less']
})
export class ChatWindowHeaderComponent {
  @Input()
  recipient?: Recipient;

  @Input()
  isCollapsed!: boolean;

  @Output()
  closeClick = new EventEmitter<void>();

  @Output()
  headerClick = new EventEmitter<void>();

  get status$(): Observable<string> {
    return (this.recipient as Contact).presence$.pipe(
      map((presence) => this.chatService.translations.presence[presence])
    );
  }

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    @Inject(CONTACT_CLICK_HANDLER_TOKEN)
    @Optional()
    readonly contactClickHandler: ChatContactClickHandler
  ) {}

  onContactClick($event: MouseEvent): void {
    if (!this.contactClickHandler || this.isCollapsed || !this.recipient) {
      return;
    }

    $event.stopPropagation();
    this.contactClickHandler.onClick(this.recipient);
  }

  recipientIsContactInWindow(): boolean {
    if (!this.recipient) {
      return false;
    }
    return isContact(this.recipient);
  }
}
