import {Component, Inject, Input, OnInit} from '@angular/core';
import {ChatService, ChatServiceToken} from '../../services/chat-service';
import {Contact, Translations} from '../../core';

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
            this.chatService.sendMessage(this.contact.jidPlain, this.message);
            this.message = '';
        }
    }

}
