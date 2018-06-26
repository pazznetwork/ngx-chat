import { Component, Inject, Input, OnInit } from '@angular/core';

import { Translations } from '../core';
import { ChatService, ChatServiceToken } from '../services/chat-service';

@Component({
    selector: 'ngx-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.less']
})
export class ChatComponent implements OnInit {

    @Input()
    public translations: Translations = {
        'contacts': 'Contacts',
        'noMessages': 'No messages yet.',
        'placeholder': 'Enter your message!'
    };

    showChatComponent = false;
    rosterState = 'hidden';

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
    }

    ngOnInit() {
        this.chatService.state$.subscribe($e => this.onChatStateChange($e));
        const rosterState = localStorage.getItem('pazzNgxChatRosterState') || 'hidden';
        this.onRosterStateChanged(rosterState);
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
