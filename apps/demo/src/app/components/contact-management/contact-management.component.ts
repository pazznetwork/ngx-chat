// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, inject, Input } from '@angular/core';
import { CHAT_LIST_STATE_SERVICE_TOKEN, CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, JsonPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { ChatWindowContentComponent } from '@pazznetwork/ngx-chat';

@Component({
    selector: 'ngx-chat-demo-contact-management',
    templateUrl: './contact-management.component.html',
    imports: [
        FormsModule,
        NgIf,
        ChatWindowContentComponent,
        AsyncPipe,
        NgForOf,
        KeyValuePipe,
        JsonPipe,
    ]
})
export class ContactManagementComponent {
  private readonly chatListStateService = inject(CHAT_LIST_STATE_SERVICE_TOKEN);
  readonly chatService = inject(CHAT_SERVICE_TOKEN);

  @Input()
  domain?: string;

  otherJid = '';

  async onAddContact(): Promise<void> {
    await this.chatService.contactListService.addContact(this.ensureFullJid());
  }

  async onRemoveContact(): Promise<void> {
    await this.chatService.contactListService.removeContact(this.ensureFullJid());
  }

  async onOpenChat(): Promise<void> {
    this.chatListStateService.openChat(
      await this.chatService.contactListService.getOrCreateContactById(this.ensureFullJid()),
      false
    );
  }

  async blockContact(): Promise<void> {
    await this.chatService.contactListService.blockJid(this.ensureFullJid());
  }

  async unblockContact(): Promise<void> {
    await this.chatService.contactListService.unblockJid(this.ensureFullJid());
  }

  private ensureFullJid(): string {
    if (!this.otherJid) {
      throw new Error(`this.otherJid is undefined`);
    }
    if (!this.domain) {
      throw new Error(`this.domain is undefined`);
    }

    return this.otherJid?.includes('@') ? this.otherJid : this.otherJid + '@' + this.domain;
  }
}
