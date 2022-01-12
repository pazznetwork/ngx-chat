import { Component, Inject, ViewChild } from '@angular/core';
import {
    Affiliation,
    CHAT_SERVICE_TOKEN,
    ChatService,
    MUC_SUB_EVENT_TYPE,
    MucSubPlugin,
    MultiUserChatPlugin,
    RoomUser,
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
    @ViewChild('occupantJidInput') occupantJidInput: NgModel;
    occupantJidText: string;
    occupantJid: JID | null = null;
    selectedRoom: Room;
    allRooms: RoomSummary[] = [];
    roomUserList: RoomUser[] = [];
    newRoom?: RoomCreationOptions;
    mucSubSubscriptions = new Map<string, string[]>();

    constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
        this.mucSubPlugin = chatService.getPlugin(MucSubPlugin);
    }

    updateOccupantJid(enteredJid: string) {
        try {
            this.occupantJid = jid(enteredJid);
            this.occupantJidInput.control.setErrors(null);
        } catch (e) {
            this.occupantJidInput.control.setErrors({notAJid: true});
        }
    }

    async joinRoom(occupantJid: JID) {
        this.selectedRoom = await this.multiUserChatPlugin.joinRoom(occupantJid);
        this.occupantJid = occupantJid;
        this.occupantJidText = occupantJid.toString();
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

    async queryUserList(occupantJid: JID) {
        this.roomUserList = await this.multiUserChatPlugin.queryUserList(occupantJid);
    }

    displayMemberJid(member: RoomUser): string {
        return member.userIdentifiers[0].userJid.bare().toString();
    }

    displayMemberNicks(member: RoomUser): string {
        const nicks = new Set(member.userIdentifiers
            .filter(id => id.nick != null)
            .map(id => id.nick));
        return [...nicks].join(', ');
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

    findIdWithNick(member: RoomUser) {
        return member.userIdentifiers.find(id => id.nick != null);
    }

    async kick(member: RoomUser) {
        const {nick} = this.findIdWithNick(member);
        await this.multiUserChatPlugin.kickOccupant(nick, this.selectedRoom.jidBare);
    }

    async banOrUnban(member: RoomUser) {
        const memberJid = member.userIdentifiers[0].userJid.bare();
        if (member.affiliation === Affiliation.outcast) {
            await this.multiUserChatPlugin.unbanUser(memberJid, this.selectedRoom.jidBare);
            return;
        }
        await this.multiUserChatPlugin.banUser(memberJid, this.selectedRoom.jidBare);
    }

    async leaveRoom(roomJid: JID) {
        if (roomJid.equals(this.occupantJid.bare())) {
            this.occupantJidText = '';
            this.occupantJid = null;
            this.selectedRoom = null;
        }
        await this.multiUserChatPlugin.leaveRoom(roomJid);
    }
}
