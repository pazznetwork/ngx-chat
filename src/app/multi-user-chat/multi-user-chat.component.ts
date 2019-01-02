import { Component, Inject, OnInit } from '@angular/core';
import { jid as parseJid } from '@xmpp/jid';
import { ChatService, ChatServiceToken, MultiUserChatPlugin, Room } from '../ngx-chat-imports';

@Component({
    selector: 'app-multi-user-chat',
    templateUrl: './multi-user-chat.component.html',
    styleUrls: ['./multi-user-chat.component.css']
})
export class MultiUserChatComponent implements OnInit {

    multiUserChatPlugin: MultiUserChatPlugin;
    roomJid: string;
    selectedRoom: Room;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit() {
    }

    joinRoom(roomJid: string) {
        const occupantJid = parseJid(roomJid);
        this.multiUserChatPlugin.joinRoom(occupantJid);
    }

}
