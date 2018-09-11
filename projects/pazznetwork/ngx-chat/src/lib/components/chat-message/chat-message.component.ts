import { Component, Inject, Input, OnInit } from '@angular/core';
import { Message } from '../../core';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-message',
    templateUrl: './chat-message.component.html',
    styleUrls: ['./chat-message.component.less']
})
export class ChatMessageComponent implements OnInit {

    @Input()
    showAvatars: boolean;

    @Input()
    avatar?: string;

    @Input()
    message: Message;

    @Input()
    nick: string;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {}

    ngOnInit() {
    }

}
