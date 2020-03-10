import { Component, ElementRef, Inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Contact } from '../../core/contact';
import { Direction } from '../../core/message';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message-list',
    templateUrl: './chat-message-list.component.html',
    styleUrls: ['./chat-message-list.component.less']
})
export class ChatMessageListComponent implements OnInit, OnDestroy, OnChanges {

    @Input()
    contact: Contact;

    @Input()
    showAvatars: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    private messageSubscription: Subscription;
    Direction = Direction;

    constructor(public chatListService: ChatListStateService,
                @Inject(ChatServiceToken) public chatService: ChatService,
                private chatMessageListRegistry: ChatMessageListRegistryService) {
    }

    ngOnInit() {
        this.messageSubscription = this.contact.messages$.subscribe(() => {
            this.scheduleScrollToLastMessage();
        });
        this.chatMessageListRegistry.incrementOpenWindowCount(this.contact);
    }

    ngOnChanges(changes: SimpleChanges): void {
        const contact = changes.contact;

        if (contact && contact.previousValue && contact.currentValue) {
            this.chatMessageListRegistry.decrementOpenWindowCount(contact.previousValue);
            this.chatMessageListRegistry.incrementOpenWindowCount(contact.currentValue);
        }

        if (contact && contact.currentValue) {
            this.scheduleScrollToLastMessage();
        }
    }

    ngOnDestroy(): void {
        this.messageSubscription.unsubscribe();
        this.chatMessageListRegistry.decrementOpenWindowCount(this.contact);
    }

    acceptSubscriptionRequest(event: Event) {
        event.preventDefault();
        this.chatService.addContact(this.contact.jidBare.toString());
    }

    denySubscriptionRequest(event: Event) {
        event.preventDefault();
        this.chatService.removeContact((this.contact.jidBare.toString()));
        this.chatListService.closeChat(this.contact);
    }

    private scheduleScrollToLastMessage() {
        setTimeout(() => this.scrollToLastMessage(), 0);
    }

    private scrollToLastMessage() {
        if (this.chatMessageAreaElement) {
            this.chatMessageAreaElement.nativeElement.scrollTop = this.chatMessageAreaElement.nativeElement.scrollHeight;
        }
    }

}
