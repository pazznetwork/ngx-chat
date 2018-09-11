import { Component, Inject, Input, OnInit } from '@angular/core';
import { Room } from '../../services/adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-room-messages',
    templateUrl: './chat-room-messages.component.html',
    styleUrls: ['./chat-room-messages.component.less']
})
export class ChatRoomMessagesComponent implements OnInit {

    @Input()
    room: Room;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
    }

    ngOnInit() {
    }

}
