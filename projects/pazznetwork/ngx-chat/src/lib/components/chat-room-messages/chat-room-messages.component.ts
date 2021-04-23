import { Component, ElementRef, Inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { JID } from '@xmpp/jid';
import { Subscription } from 'rxjs';
import { Contact } from '../../core/contact';
import { Direction } from '../../core/message';
import { Room } from '../../services/adapters/xmpp/plugins/multi-user-chat.plugin';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';
import { ContactFactoryService } from '../../services/contact-factory.service';

@Component({
    selector: 'ngx-chat-room-messages',
    templateUrl: './chat-room-messages.component.html',
    styleUrls: ['./chat-room-messages.component.less'],
})
// TODO: de-duplicate with ChatMessageListComponent (#62)
export class ChatRoomMessagesComponent implements OnInit, OnChanges, OnDestroy {

    @Input()
    room: Room;

    @Input()
    showAvatars = true;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    Direction = Direction;

    private messageSubscription: Subscription;

    constructor(
        @Inject(ChatServiceToken) public chatService: ChatService,
        private contactFactory: ContactFactoryService,
        private chatMessageListRegistryService: ChatMessageListRegistryService,
    ) {
    }

    ngOnInit() {
        this.messageSubscription = this.room.messages$.subscribe(() => {
            this.scheduleScrollToLastMessage();
        });
        this.chatMessageListRegistryService.incrementOpenWindowCount(this.room);
    }

    ngOnChanges(changes: SimpleChanges) {
        const room = changes.room;

        if (room && room.currentValue) {
            this.scheduleScrollToLastMessage();
        }
    }

    ngOnDestroy(): void {
        this.messageSubscription.unsubscribe();
        this.chatMessageListRegistryService.decrementOpenWindowCount(this.room);
    }

    getOrCreateContactWithFullJid(fullJid: JID): Contact {
        let matchingContact = this.chatService.contacts$.getValue().find(
            contact => contact.jidFull.equals(fullJid),
        );

        if (!matchingContact) {
            matchingContact = this.contactFactory.createContact(fullJid.toString(), fullJid.resource);
            this.chatService.contacts$.next([matchingContact].concat(this.chatService.contacts$.getValue()));
        }

        return matchingContact;
    }

    scheduleScrollToLastMessage() {
        setTimeout(() => this.scrollToLastMessage(), 0);
    }

    private scrollToLastMessage() {
        if (this.chatMessageAreaElement) {
            this.chatMessageAreaElement.nativeElement.scrollTop = this.chatMessageAreaElement.nativeElement.scrollHeight;
        }
    }
}
