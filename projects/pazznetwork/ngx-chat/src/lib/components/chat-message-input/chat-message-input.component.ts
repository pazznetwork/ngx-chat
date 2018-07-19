import { Component, Inject, Input, OnInit } from '@angular/core';

import { Contact } from '../../core';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message-input',
    templateUrl: './chat-message-input.component.html',
    styleUrls: ['./chat-message-input.component.less']
})
export class ChatMessageInputComponent implements OnInit {

    @Input()
    public contact: Contact;

    public message = '';

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
    }

    ngOnInit() {
    }

    public onSendMessage() {
        if (this.message.trim().length > 0) {
            this.chatService.sendMessage(this.contact.jidBare.toString(), this.message);
            this.message = '';
        }
    }

}
