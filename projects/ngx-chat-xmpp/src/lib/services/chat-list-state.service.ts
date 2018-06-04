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

    public openChatCollapsed(jidPlain: string) {
        if (!this.isChatWithJidOpen(jidPlain)) {
            const openChats = this.openChats$.getValue();
            const chatWindow = new ChatWindowState(this.chatService.getContactByJid(jidPlain), true);
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

export class ChatWindowState {
    constructor(public contact: Contact,
                public isCollapsed: boolean) {
    }
}
