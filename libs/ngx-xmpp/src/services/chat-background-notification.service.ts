// SPDX-License-Identifier: AGPL-3.0-or-later
import { Inject, Injectable } from '@angular/core';
import { CHAT_SERVICE_TOKEN } from '../injection-token';
import {
  ChatBrowserNotificationService,
  ChatService,
  Contact,
  Room,
} from '@pazznetwork/ngx-chat-shared';

@Injectable()
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

  private receivedGroupMessage(room: Room): void {
    if (this.shouldDisplayNotification()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const message = room.messageStore.mostRecentMessage!.body;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sender = room.messageStore.mostRecentMessage!.from!.resource!;
      const options = this.customizeGroupMessage(sender, message, room);
      const notification = new Notification(room.name as string, options);
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });
    }
  }

  protected customizeGroupMessage(
    senderJid: string,
    message: string,
    room: Room
  ): NotificationOptions {
    return { body: `${senderJid}: ${message}`, icon: room?.avatar };
  }

  private shouldDisplayNotification(): boolean {
    return (
      this.enabled &&
      document.visibilityState === 'hidden' &&
      this.supportsNotification() &&
      Notification.permission === 'granted'
    );
  }

  private supportsNotification(): boolean {
    return 'Notification' in window;
  }
}
