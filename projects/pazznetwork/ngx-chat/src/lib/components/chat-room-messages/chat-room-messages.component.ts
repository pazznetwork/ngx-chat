import { Component, Inject, Input } from '@angular/core';
import { JID } from '@xmpp/jid';
import { Contact } from '../../core';
import { Room } from '../../services/adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from '../../services/chat-service';
import { ContactFactoryService } from '../../services/contact-factory.service';

@Component({
    selector: 'ngx-chat-room-messages',
    templateUrl: './chat-room-messages.component.html',
    styleUrls: ['./chat-room-messages.component.less']
})
export class ChatRoomMessagesComponent {

    @Input()
    room: Room;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService,
                private contactFactory: ContactFactoryService) {
    }

    getOrCreateContactWithFullJid(fullJid: JID): Contact {
        let matchingContact = this.chatService.contacts$.getValue().find(
            contact => contact.jidFull.equals(fullJid)
        );

        if (!matchingContact) {
            matchingContact = this.contactFactory.createContact(fullJid.toString(), fullJid.resource);
            this.chatService.contacts$.next([matchingContact].concat(this.chatService.contacts$.getValue()));
        }

        return matchingContact;
    }
}
