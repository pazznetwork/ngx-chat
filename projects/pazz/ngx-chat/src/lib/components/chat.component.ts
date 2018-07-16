import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';

import { Contact, Translations } from '../core';
import { ChatService, ChatServiceToken } from '../services/chat-service';

@Component({
    selector: 'ngx-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.less']
})
export class ChatComponent implements OnInit, OnChanges {

    @Input()
    public translations: Translations = {
        'contacts': 'Contacts',
        'noMessages': 'No messages yet.',
        'placeholder': 'Enter your message!',
        'subscriptionRequestMessage': 'I want to add you as a contact.',
        'acceptSubscriptionRequest': 'Accept',
        'denySubscriptionRequest': 'Deny'
    };

    @Input()
    public contacts: Observable<Contact[]>;

    @Input()
    public userAvatar$: undefined | Observable<string>;

    showChatComponent = false;
    rosterState = 'hidden';

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
    }

    ngOnInit() {
        this.chatService.state$.subscribe($e => this.onChatStateChange($e));
        const rosterState = localStorage.getItem('pazzNgxChatRosterState') || 'hidden';
        this.onRosterStateChanged(rosterState);

        if (this.userAvatar$) {
            this.userAvatar$.subscribe(avatar => this.chatService.userAvatar$.next(avatar));
        }

        this.chatService.translations = this.translations;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.translations) {
            this.chatService.translations = this.translations;
        }
    }

    private onChatStateChange(state: string) {
        this.showChatComponent = state === 'online';
        this.updateBodyClass();
    }

    onRosterStateChanged(state: string) {
        localStorage.setItem('pazzNgxChatRosterState', state);
        this.rosterState = state;
        this.updateBodyClass();
    }

    private updateBodyClass() {
        const rosterClass = 'has-roster';
        if (this.showChatComponent && this.rosterState !== 'hidden') {
            document.body.classList.add(rosterClass);
        } else {
            document.body.classList.remove(rosterClass);
        }
    }

}
