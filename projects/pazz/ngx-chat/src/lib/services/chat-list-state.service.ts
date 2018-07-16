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
                this.openChat(contact.jidPlain);
            }
        });
    }

    public openChatCollapsed(jidPlain: string) {
        if (!this.isChatWithJidOpen(jidPlain)) {
            const openChats = this.openChats$.getValue();
            const chatWindow = new ChatWindowState(this.chatService.getOrCreateContactById(jidPlain), true);
            const copyWithNewContact = [chatWindow].concat(openChats);
            this.openChats$.next(copyWithNewContact);
        }
    }

    public openChat(jidPlain: string) {
        this.openChatCollapsed(jidPlain);
        this.findChatWindowStateByJid(jidPlain).isCollapsed = false;
    }

    public closeChat(contactToClose: Contact) {
        const openChats = this.openChats$.getValue();
        const index = this.findChatWindowStateIndexByJid(contactToClose.jidPlain);
        if (index >= 0) {
            const copyWithoutContact = openChats.slice();
            copyWithoutContact.splice(index, 1);
            this.openChats$.next(copyWithoutContact);
        }
    }

    private isChatWithJidOpen(jidPlain: string) {
        return this.findChatWindowStateIndexByJid(jidPlain) >= 0;
    }

    private findChatWindowStateIndexByJid(jidPlain: string) {
        return this.openChats$.getValue()
            .findIndex((chatWindowState) => chatWindowState.contact.jidPlain === jidPlain);
    }

    private findChatWindowStateByJid(jidPlain: string) {
        return this.openChats$.getValue()
            .find((chatWindowState) => chatWindowState.contact.jidPlain === jidPlain);
    }
}
