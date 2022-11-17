import { Inject, Injectable } from '@angular/core';
import { JID } from '@xmpp/jid';
import { Contact } from '../core/contact';
import { MultiUserChatPlugin, Room } from './adapters/xmpp/plugins/multi-user-chat.plugin';
import { CHAT_SERVICE_TOKEN, ChatService } from './chat-service';

@Injectable()
export class ChatBackgroundNotificationService {

    private enabled = false;

    constructor(@Inject(CHAT_SERVICE_TOKEN) protected chatService: ChatService) {
        chatService.message$.subscribe((msg) => {
            this.receivedDirectMessage(msg);
        });
        chatService.getPlugin(MultiUserChatPlugin).message$.subscribe(async room => {
            await this.receivedGroupMessage(room);
        });
    }

    enable() {
        if (this.supportsNotification()) {
            this.requestNotificationPermission();
            this.enabled = true;
        }
    }

    disable() {
        this.enabled = false;
    }

    private requestNotificationPermission() {
        const notification = Notification as any;
        notification.requestPermission();
    }

    private receivedDirectMessage(contact: Contact) {
        if (this.shouldDisplayNotification()) {
            const notification = new Notification(contact.name, {body: contact.mostRecentMessage.body, icon: contact.avatar});
            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });
        }
    }

    private async receivedGroupMessage(room: Room) {
        if (this.shouldDisplayNotification()) {
            const message = room.mostRecentMessage.body;
            const sender = room.mostRecentMessage.from;
            const options = await this.customizeGroupMessage(sender, message);
            const notification = new Notification(room.name, options);
            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });
        }
    }

    protected async customizeGroupMessage(sender: JID, message: string) {
        return {body: `${sender}: ${message}`};
    }

    private shouldDisplayNotification() {
        const notification = Notification as any;
        return this.enabled
            && document.visibilityState === 'hidden'
            && this.supportsNotification()
            && notification.permission === 'granted';
    }

    private supportsNotification() {
        return 'Notification' in window;
    }
}
