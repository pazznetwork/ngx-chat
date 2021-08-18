import { Component, Inject, OnInit } from '@angular/core';
import {
    ChatService,
    ChatServiceToken,
    MultiUserChatPlugin,
    Room,
    RoomSummary,
    RoomCreationOptions,
    MucSubPlugin,
    MUC_SUB_EVENT_TYPE,
} from '@pazznetwork/ngx-chat';
import { jid } from '@xmpp/client';

@Component({
    selector: 'app-multi-user-chat',
    templateUrl: './multi-user-chat.component.html',
    styleUrls: ['./multi-user-chat.component.css']
})
export class MultiUserChatComponent implements OnInit {

    multiUserChatPlugin: MultiUserChatPlugin;
    mucSubPlugin: MucSubPlugin;
    roomJid: string;
    selectedRoom: Room;
    allRooms: RoomSummary[] = [];
    newRoom?: RoomCreationOptions;
    mucSubSubscriptions: Map<string, string[]> = new Map();

    constructor(@Inject(ChatServiceToken) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
        this.mucSubPlugin = chatService.getPlugin(MucSubPlugin);
    }

    ngOnInit() {
    }

    async joinRoom(roomJid: string) {
        const occupantJid = jid(roomJid);
        this.selectedRoom = await this.multiUserChatPlugin.joinRoom(occupantJid);
    }

    async subscribeWithMucSub(roomJid: string): Promise<void> {
        await this.mucSubPlugin.subscribeRoom(roomJid, [MUC_SUB_EVENT_TYPE.messages]);
    }

    async unsubscribeFromMucSub(roomJid: string): Promise<void> {
        await this.mucSubPlugin.unsubscribeRoom(roomJid);
    }

    async getSubscriptions() {
        this.mucSubSubscriptions = await this.mucSubPlugin.retrieveSubscriptions();
    }

    async destroyRoom(roomJid: string) {
        const occupantJid = jid(roomJid);
        await this.multiUserChatPlugin.destroyRoom(occupantJid);
        await this.queryAllRooms();
    }

    async queryAllRooms() {
        this.allRooms = await this.multiUserChatPlugin.queryAllRooms();
    }

    createNewRoom(): void {
        this.newRoom = {
            roomId: '',
            membersOnly: true,
            nonAnonymous: false,
            persistentRoom: true,
            public: false,
            allowSubscription: true,
        };
    }

    cancelRoomCreation(): void {
        this.newRoom = null;
    }

    async createRoomOnServer() {
        if (!this.newRoom?.roomId || this.newRoom.roomId === '') {
            return;
        }

        await this.multiUserChatPlugin.createRoom(this.newRoom);

        this.newRoom = undefined;
    }
}
