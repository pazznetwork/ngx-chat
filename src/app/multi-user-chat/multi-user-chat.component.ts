import { Component, Inject } from '@angular/core';
import {
    CHAT_SERVICE_TOKEN,
    ChatService,
    MemberListItem,
    MUC_SUB_EVENT_TYPE,
    MucSubPlugin,
    MultiUserChatPlugin,
    Room,
    RoomCreationOptions,
    RoomSummary,
} from '@pazznetwork/ngx-chat';
import { jid } from '@xmpp/client';

@Component({
    selector: 'app-multi-user-chat',
    templateUrl: './multi-user-chat.component.html',
    styleUrls: ['./multi-user-chat.component.css']
})
export class MultiUserChatComponent {

    multiUserChatPlugin: MultiUserChatPlugin;
    mucSubPlugin: MucSubPlugin;
    roomJid: string;
    selectedRoom: Room;
    allRooms: RoomSummary[] = [];
    roomMemberList: MemberListItem[] = [];
    newRoom?: RoomCreationOptions;
    mucSubSubscriptions = new Map<string, string[]>();

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
        this.mucSubPlugin = chatService.getPlugin(MucSubPlugin);
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

    async queryMemberList(roomJid: string) {
        const fullRoomJid = new Room(jid(roomJid), null).toString();
        this.roomMemberList = await this.multiUserChatPlugin.queryMemberList(fullRoomJid);
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
