import { Component, Inject, ViewChild } from '@angular/core';
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
    RoomSummary,
    JID,
} from '@pazznetwork/ngx-chat';
import { jid } from '@xmpp/jid';
import { NgModel } from '@angular/forms';

@Component({
    selector: 'app-multi-user-chat',
    templateUrl: './multi-user-chat.component.html',
    styleUrls: ['./multi-user-chat.component.css'],
})
export class MultiUserChatComponent {

    multiUserChatPlugin: MultiUserChatPlugin;
    mucSubPlugin: MucSubPlugin;
    @ViewChild('roomOccupantJid') roomOccupantJid: NgModel;
    enteredOccupantJid: string;
    occupantJid: JID;
    selectedRoom: Room;
    allRooms: RoomSummary[] = [];
    roomMemberList: Occupant[] = [];
    newRoom?: RoomCreationOptions;
    mucSubSubscriptions = new Map<string, string[]>();

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
        this.mucSubPlugin = chatService.getPlugin(MucSubPlugin);
    }

    updateOccupantJid(enteredJid: string) {
        try {
            this.occupantJid = jid(enteredJid);
            this.roomOccupantJid.control.setErrors(null);
        } catch (e) {
            this.roomOccupantJid.control.setErrors({notAJid: true});
        }
    }

    async joinRoom(occupantJid: JID) {
        this.selectedRoom = await this.multiUserChatPlugin.joinRoom(occupantJid);
        this.occupantJid = occupantJid;
        this.enteredOccupantJid = occupantJid.toString();
    }

    async subscribeWithMucSub(occupantJid: JID): Promise<void> {
        await this.mucSubPlugin.subscribeRoom(occupantJid.toString(), [MUC_SUB_EVENT_TYPE.messages]);
    }

    async unsubscribeFromMucSub(occupantJid: JID): Promise<void> {
        await this.mucSubPlugin.unsubscribeRoom(occupantJid.toString());
    }

    async getSubscriptions() {
        this.mucSubSubscriptions = await this.mucSubPlugin.retrieveSubscriptions();
    }

    async queryMemberList(occupantJid: JID) {
        this.roomMemberList = await this.multiUserChatPlugin.queryMemberList(occupantJid);
    }

    async destroyRoom(occupantJid: JID) {
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
        await this.multiUserChatPlugin.kickOccupant(nick, this.selectedRoom.jidBare);
    }

    async banOrUnban(memberJid: JID, affiliation?: Affiliation, reason?: string) {
        if (affiliation === Affiliation.outcast) {
            await this.multiUserChatPlugin.unbanOccupant(memberJid, this.selectedRoom.jidBare);
            return;
        }
        await this.multiUserChatPlugin.banOccupant(memberJid, this.selectedRoom.jidBare, reason);
    }

    async leaveRoom(roomJid: JID) {
        if (roomJid === this.occupantJid) {
            this.occupantJid = '';
            this.selectedRoom = null;
        }
        await this.multiUserChatPlugin.leaveRoom(roomJid);
    }
}
