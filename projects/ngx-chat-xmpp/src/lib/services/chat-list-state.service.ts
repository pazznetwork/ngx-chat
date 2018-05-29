import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Contact } from '../core';
import { ChatService } from './chat.service';

@Injectable()
export class ChatListStateService {

    public openChats$ = new BehaviorSubject<ChatWindowState[]>([]);

    constructor(private chatService: ChatService) {
        this.chatService.state$
            .pipe(filter(newState => newState === 'disconnected'))
            .subscribe(() => {
                this.openChats$.next([]);
            });
    }

    public openChatCollapsed(jid: string) {
        if (!this.isChatWithJidOpen(jid)) {
            const openChats = this.openChats$.getValue();
            const chatWindow = new ChatWindowState(this.chatService.getContactByJid(jid), true);
            const copyWithNewContact = [chatWindow].concat(openChats);
            this.openChats$.next(copyWithNewContact);
        }
    }

    public openChat(jid: string) {
        this.openChatCollapsed(jid);
        this.findChatWindowStateByJid(jid).isCollapsed = false;
    }

    public closeChat(contactToClose: Contact) {
        const openChats = this.openChats$.getValue();
        const index = this.findChatWindowStateIndexByJid(contactToClose.jid);
        if (index >= 0) {
            const copyWithoutContact = openChats.slice();
            copyWithoutContact.splice(index, 1);
            this.openChats$.next(copyWithoutContact);
        }
    }

    private isChatWithJidOpen(jid: string) {
        return this.findChatWindowStateIndexByJid(jid) >= 0;
    }

    private findChatWindowStateIndexByJid(jid: string) {
        return this.openChats$.getValue()
            .findIndex((chatWindowState) => chatWindowState.contact.jid === jid);
    }

    private findChatWindowStateByJid(jid: string) {
        return this.openChats$.getValue()
            .find((chatWindowState) => chatWindowState.contact.jid === jid);
    }
}

export class ChatWindowState {
    constructor(public contact: Contact,
                public isCollapsed: boolean) {
    }
}
