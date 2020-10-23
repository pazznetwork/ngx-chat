import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Contact } from '../../core/contact';
import { MultiUserChatPlugin, Room } from '../../services/adapters/xmpp/plugins/multi-user-chat.plugin';
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

    @Output()
    public messageSent = new EventEmitter<void>();

    public message = '';

    @ViewChild('chatInput')
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
        this.messageSent.emit();
        return false;
    }

    focus() {
        this.chatInput.nativeElement.focus();
    }

}
