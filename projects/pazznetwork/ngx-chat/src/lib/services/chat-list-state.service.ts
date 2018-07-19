import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Contact } from '../core';
import { ChatService, ChatServiceToken } from './chat-service';

export class ChatWindowState {
    constructor(public contact: Contact,
                public isCollapsed: boolean) {
    }
}

@Injectable()
export class ChatListStateService {

    public openChats$ = new BehaviorSubject<ChatWindowState[]>([]);

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
        this.chatService.state$
            .pipe(filter(newState => newState === 'disconnected'))
            .subscribe(() => {
                this.openChats$.next([]);
            });

        this.chatService.contactRequestsReceived$.subscribe(contacts => {
            for (const contact of contacts) {
                this.openChat(contact);
            }
        });
    }

    private openChatCollapsed(contact: Contact) {
        if (!this.isChatWithContactOpen(contact)) {
            const openChats = this.openChats$.getValue();
            const chatWindow = new ChatWindowState(contact, true);
            const copyWithNewContact = [chatWindow].concat(openChats);
            this.openChats$.next(copyWithNewContact);
        }
    }

    public openChat(contact: Contact) {
        this.openChatCollapsed(contact);
        this.findChatWindowStateByContact(contact).isCollapsed = false;
    }

    public closeChat(contactToClose: Contact) {
        const openChats = this.openChats$.getValue();
        const index = this.findChatWindowStateIndexByContact(contactToClose);
        if (index >= 0) {
            const copyWithoutContact = openChats.slice();
            copyWithoutContact.splice(index, 1);
            this.openChats$.next(copyWithoutContact);
        }
    }

    private isChatWithContactOpen(contact: Contact) {
        return this.findChatWindowStateIndexByContact(contact) >= 0;
    }

    private findChatWindowStateIndexByContact(contact: Contact) {
        return this.openChats$.getValue()
            .findIndex((chatWindowState) => chatWindowState.contact.equalsBareJid(contact));
    }

    private findChatWindowStateByContact(contact: Contact) {
        return this.openChats$.getValue()
            .find((chatWindowState) => chatWindowState.contact.equalsBareJid(contact));
    }
}
