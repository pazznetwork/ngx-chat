import { Component, Inject } from '@angular/core';
import {
    Affiliation,
    CHAT_SERVICE_TOKEN,
    ChatService,
    MUC_SUB_EVENT_TYPE,
    MucSubPlugin,
    MultiUserChatPlugin,
    Occupant,
    Room,
    RoomCreationOptions,
    RoomSummary
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
    roomMemberList: Occupant[] = [];
    newRoom?: RoomCreationOptions;
    mucSubSubscriptions = new Map<string, string[]>();

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
        this.mucSubPlugin = chatService.getPlugin(MucSubPlugin);
    }

    async joinRoom(roomJid: string) {
        const occupantJid = jid(roomJid);
        this.selectedRoom = await this.multiUserChatPlugin.joinRoom(occupantJid);
        this.roomJid = roomJid;
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
        this.roomMemberList = await this.multiUserChatPlugin.queryMemberList(roomJid);
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

    async kick(nick: string) {
        await this.multiUserChatPlugin.kickOccupant(nick, this.selectedRoom.jidBare.toString());
    }

    async banOrUnban(memberJid: string, affiliation?: Affiliation, reason?: string) {
        if (affiliation === Affiliation.outcast) {
            await this.multiUserChatPlugin.unbanOccupant(memberJid, this.selectedRoom.jidBare.toString());
            return;
        }
        await this.multiUserChatPlugin.banOccupant(memberJid, this.selectedRoom.jidBare.toString(), reason);
    }

    async leaveRoom(roomJid: string) {
        if (roomJid === this.roomJid) {
            this.roomJid = '';
            this.selectedRoom = null;
        }
        await this.multiUserChatPlugin.leaveRoom(roomJid);
    }
}
