import { Inject, Injectable } from '@angular/core';
import { JID } from '@xmpp/jid';
import { Contact } from '../core';
import { MultiUserChatPlugin, Room } from './adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from './chat-service';

@Injectable()
export class ChatBackgroundNotificationService {

    private enabled = false;

    constructor(@Inject(ChatServiceToken) protected chatService: ChatService) {
        chatService.message$.subscribe((msg) => {
            this.receivedDirectMessage(msg);
        });
        chatService.getPlugin(MultiUserChatPlugin).message$.subscribe(room => {
            this.receivedGroupMessage(room);
        });
    }

    enable() {
        this.requestNotificationPermission();
        this.enabled = true;
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
            const options = await this.customizeGroupMessage(sender, message, room);
            const notification = new Notification(room.name, options);
            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });
        }
    }

    protected async customizeGroupMessage(sender: JID, message: string, room: Room) {
        return {body: `${sender}: ${message}`};
    }

    private shouldDisplayNotification() {
        const notification = Notification as any;
        return this.enabled && document.visibilityState === 'hidden' && 'Notification' in window && notification.permission === 'granted';
    }

}
