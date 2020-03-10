import { Component, Inject, OnInit } from '@angular/core';
import { ChatService, ChatServiceToken, MultiUserChatPlugin, Room, RoomSummary } from '@pazznetwork/ngx-chat';
import { jid } from '@xmpp/client';

@Component({
    selector: 'app-multi-user-chat',
    templateUrl: './multi-user-chat.component.html',
    styleUrls: ['./multi-user-chat.component.css']
})
export class MultiUserChatComponent implements OnInit {

    multiUserChatPlugin: MultiUserChatPlugin;
    roomJid: string;
    selectedRoom: Room;
    allRooms: RoomSummary[] = [];

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit() {
    }

    async joinRoom(roomJid: string) {
        const occupantJid = jid(roomJid);
        this.selectedRoom = await this.multiUserChatPlugin.joinRoom(occupantJid);
    }

    async queryAllRooms() {
        this.allRooms = await this.multiUserChatPlugin.queryAllRooms();
    }
}
