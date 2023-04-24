// SPDX-License-Identifier: AGPL-3.0-or-later
import { Inject, Injectable } from '@angular/core';
import type { ChatService, Contact, JID, Room } from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN } from '../injection-token';
import { mergeMap } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class ChatBackgroundNotificationService {
  private enabled = false;

  constructor(@Inject(CHAT_SERVICE_TOKEN) protected chatService: ChatService) {
    chatService.messageService.message$
      .pipe(filter((message) => message.recipientType === 'contact'))
      .subscribe((msg): void => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        this.receivedDirectMessage(msg as Contact);
      });
    chatService.roomService.groupMessage$
      .pipe(mergeMap((room): Promise<void> => this.receivedGroupMessage(room)))
      .subscribe();
  }

  async enable(): Promise<NotificationPermission> {
    if (!this.supportsNotification()) {
      return 'denied' as NotificationPermission;
    }
    this.enabled = true;
    return Notification.requestPermission();
  }

  disable(): void {
    this.enabled = false;
  }

  private receivedDirectMessage(contact: Contact): void {
    if (this.shouldDisplayNotification()) {
      const notification = new Notification(contact.name, {
        body: contact.messageStore.mostRecentMessage?.body,
        icon: contact.avatar,
      });
      notification.addEventListener('click', (): void => {
        window.focus();
        notification.close();
      });
    }
  }

  private async receivedGroupMessage(room: Room): Promise<void> {
    if (!this.shouldDisplayNotification()) {
      return;
    }

    const message = room.messageStore.mostRecentMessage?.body;
    const sender = room.messageStore.mostRecentMessage?.from;

    if (!message || !sender) {
      return;
    }

    const options = await this.customizeGroupMessage(sender, message);
    if (!room?.name) {
      throw new Error(`room name is not defined, ${JSON.stringify(room)}`);
    }
    const notification = new Notification(room.name, options);
    notification.addEventListener('click', (): void => {
      window.focus();
      notification.close();
    });
  }

  protected customizeGroupMessage(sender: JID, message: string): Promise<{ body: string }> {
    return Promise.resolve({ body: `${sender?.toString()}: ${message}` });
  }

  private shouldDisplayNotification(): boolean {
    let notification: {
      prototype: Notification;
      new (title: string, options?: NotificationOptions): Notification;
      readonly permission: NotificationPermission;
      requestPermission(
        deprecatedCallback?: NotificationPermissionCallback
      ): Promise<NotificationPermission>;
    };
    // eslint-disable-next-line prefer-const
    notification = Notification;
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
