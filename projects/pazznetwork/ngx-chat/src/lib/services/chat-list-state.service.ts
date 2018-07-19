import { Inject, Injectable } from '@angular/core';
import { JID } from '@xmpp/jid';
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
                this.openChat(contact.jidBare);
            }
        });
    }

    public openChatCollapsed(jid: JID) {
        if (!this.isChatWithJidOpen(jid)) {
            const openChats = this.openChats$.getValue();
            const contact = this.chatService.getOrCreateContactById(jid.bare().toString());
            const chatWindow = new ChatWindowState(contact, true);
            const copyWithNewContact = [chatWindow].concat(openChats);
            this.openChats$.next(copyWithNewContact);
        }
    }

    public openChat(jid: JID) {
        this.openChatCollapsed(jid);
        this.findChatWindowStateByJid(jid).isCollapsed = false;
    }

    public closeChat(contactToClose: Contact) {
        const openChats = this.openChats$.getValue();
        const index = this.findChatWindowStateIndexByJid(contactToClose.jidBare);
        if (index >= 0) {
            const copyWithoutContact = openChats.slice();
            copyWithoutContact.splice(index, 1);
            this.openChats$.next(copyWithoutContact);
        }
    }

    private isChatWithJidOpen(jid: JID) {
        return this.findChatWindowStateIndexByJid(jid) >= 0;
    }

    private findChatWindowStateIndexByJid(jid: JID) {
        return this.openChats$.getValue()
            .findIndex((chatWindowState) => chatWindowState.contact.equalsBareJid(jid));
    }

    private findChatWindowStateByJid(jid: JID) {
        return this.openChats$.getValue()
            .find((chatWindowState) => chatWindowState.contact.equalsBareJid(jid));
    }
}
