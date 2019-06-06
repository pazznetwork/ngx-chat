import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';

import { Contact } from '../../core';
import { MultiUserChatPlugin, Room } from '../../services/adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message-input',
    templateUrl: './chat-message-input.component.html',
    styleUrls: ['./chat-message-input.component.less']
})
export class ChatMessageInputComponent implements OnInit {

    @Input()
    public contact: Contact;

    @Input()
    public room: Room;

    public message = '';

    @ViewChild('chatInput', {static: false})
    chatInput: ElementRef;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
    }

    ngOnInit() {
    }

    onSendMessage() {
        if (this.message.trim().length > 0) {
            if (this.room) {
                this.chatService.getPlugin(MultiUserChatPlugin).sendMessage(this.room, this.message);
            } else {
                this.chatService.sendMessage(this.contact.jidBare.toString(), this.message);
            }
            this.message = '';
        }
        return false;
    }

    focus() {
        this.chatInput.nativeElement.focus();
    }

}
