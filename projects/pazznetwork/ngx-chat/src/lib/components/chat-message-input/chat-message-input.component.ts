import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';

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

    @ViewChild('chatInput')
    chatInput: ElementRef;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
    }

    ngOnInit() {
    }

    onSendMessage() {
        if (this.message.trim().length > 0) {
            this.chatService.sendMessage(this.contact.jidBare.toString(), this.message);
            this.message = '';
        }
        return false;
    }

    focus() {
        this.chatInput.nativeElement.focus();
    }

}
