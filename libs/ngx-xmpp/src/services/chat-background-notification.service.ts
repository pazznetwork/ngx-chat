// SPDX-License-Identifier: AGPL-3.0-or-later
import { Inject } from '@angular/core';
import { CHAT_SERVICE_TOKEN } from '../injection-token';
import {
  ChatBrowserNotificationService,
  ChatService,
  Contact,
  JID,
  Room,
} from '@pazznetwork/ngx-chat-shared';

export class ChatBackgroundNotificationService implements ChatBrowserNotificationService {
  private enabled = false;

  constructor(@Inject(CHAT_SERVICE_TOKEN) protected chatService: ChatService) {
    chatService.messageService.message$.subscribe((msg) => {
      if (msg.recipientType === 'contact') {
        this.receivedDirectMessage(msg as Contact);
      } else {
        void this.receivedGroupMessage(msg as Room);
      }
    });
  }

  enable(): void {
    if (this.supportsNotification()) {
      this.requestNotificationPermission();
      this.enabled = true;
    }
  }

  disable(): void {
    this.enabled = false;
  }

  private requestNotificationPermission(): void {
    const notification = Notification;
    void notification.requestPermission();
  }

  private receivedDirectMessage(contact: Contact): void {
    if (this.shouldDisplayNotification()) {
      const notification = new Notification(contact.name, {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        body: contact.messageStore.mostRecentMessage!.body,
        icon: contact.avatar,
      });
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });
    }
  }

  private async receivedGroupMessage(room: Room): Promise<void> {
    if (this.shouldDisplayNotification()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const message = room.messageStore.mostRecentMessage!.body;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sender = room.messageStore.mostRecentMessage!.from!;
      const options = await this.customizeGroupMessage(sender, message, room);
      const notification = new Notification(room.name as string, options);
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });
    }
  }

  protected async customizeGroupMessage(
    sender: JID,
    message: string,
    _room: Room
  ): Promise<{ body: string }> {
    return { body: `${sender.toString()}: ${message}` };
  }

  private shouldDisplayNotification(): boolean {
    const notification = Notification;
    return (
      this.enabled &&
      document.visibilityState === 'hidden' &&
      this.supportsNotification() &&
      notification.permission === 'granted'
    );
  }

  private supportsNotification(): boolean {
    return 'Notification' in window;
  }
}
