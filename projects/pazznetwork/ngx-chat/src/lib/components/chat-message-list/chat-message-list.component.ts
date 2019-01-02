import { Component, ElementRef, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { Contact } from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message-list',
    templateUrl: './chat-message-list.component.html',
    styleUrls: ['./chat-message-list.component.less']
})
export class ChatMessageListComponent implements OnInit, OnDestroy {

    @Input()
    contact: Contact;

    @Input()
    showAvatars: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    private messageSubscription: Subscription;

    constructor(public chatListService: ChatListStateService,
                @Inject(ChatServiceToken) public chatService: ChatService,
                private chatMessageListRegistry: ChatMessageListRegistryService) {
    }

    ngOnInit() {
        this.messageSubscription = this.contact.messages$.subscribe(() => {
            this.scheduleScrollToLastMessage();
        });
        this.scheduleScrollToLastMessage();
        this.chatMessageListRegistry.incrementOpenWindowCount(this.contact);
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
