import {Component, ElementRef, Inject, Input, OnInit, ViewChild} from '@angular/core';
import { Subscription } from 'rxjs';

import {Contact, Translations} from '../../core';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-messages',
    templateUrl: './chat-messages.component.html',
    styleUrls: ['./chat-messages.component.less']
})
export class ChatMessagesComponent implements OnInit {

    @Input()
    public contact: Contact;

    @Input()
    showAvatars: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    constructor(public chatListService: ChatListStateService,
                @Inject(ChatServiceToken) public chatService: ChatService) {
    }

    public ngOnInit() {
        this.contact.messages$.subscribe(() => {
            this.scheduleScrollToLastMessage();
        });
        this.scheduleScrollToLastMessage();
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
        this.chatMessageAreaElement.nativeElement.scrollTop = this.chatMessageAreaElement.nativeElement.scrollHeight;
    }


}
