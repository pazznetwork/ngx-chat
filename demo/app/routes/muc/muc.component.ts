import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
    CHAT_SERVICE_TOKEN,
    ChatService,
    ConnectionStates,
    MultiUserChatPlugin,
    Occupant,
    Room,
    RoomSummary
} from '@pazznetwork/ngx-chat';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { jid } from '@xmpp/client';

@Component({
    selector: 'app-muc',
    templateUrl: './muc.component.html',
    styleUrls: ['./muc.component.css']
})
export class MucComponent implements OnInit, OnDestroy {
    private selectedRoomSubject = new Subject<Room>();
    private selectedRoomSubscription: Subscription;
    selectedRoom$: Observable<Room> = this.selectedRoomSubject.asObservable();

    currentRoom: Room;

    inviteJid: string;
    topic: string;
    nick: string;
    memberJid: string;
    moderatorJid: string;

    rooms$: Observable<RoomSummary[]>;
    state$: Observable<ConnectionStates> = this.chatService.state$.asObservable();

    occupants: Occupant[] = [];

    private multiUserChatPlugin: MultiUserChatPlugin;
    private joinedSubscription: Subscription;
    private leftSubscription: Subscription;
    private kickedSubscription: Subscription;
    private bannedSubscription: Subscription;
    private nickSubscription: Subscription;

    constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit(): void {
        this.rooms$ = from(this.multiUserChatPlugin.queryAllRooms());
        this.selectedRoomSubscription = this.selectedRoom$.subscribe(room => {
            this.currentRoom = room;
        });
        this.joinedSubscription = this.multiUserChatPlugin.onOccupantJoined$.subscribe(occupant => {
            const index = this.occupants.findIndex(o =>
                (o.nick && occupant.nick && o.nick === occupant.nick)
            );
            if (index > -1) {
                this.occupants[index] = occupant;
            } else {
                this.occupants.push(occupant);
            }
        });
        this.nickSubscription = this.multiUserChatPlugin.onOccupantChangedNick$.subscribe(({occupant, newNick}) => {
            this.occupants.find(occ => occ.nick === occupant.nick).nick = newNick;
        });
        this.kickedSubscription = this.multiUserChatPlugin.onOccupantKicked$.subscribe(occupant => this.removeOccupant(occupant));
        this.bannedSubscription = this.multiUserChatPlugin.onOccupantBanned$.subscribe(occupant => this.removeOccupant(occupant));
        this.leftSubscription = this.multiUserChatPlugin.onOccupantLeft$.subscribe(occupant => this.removeOccupant(occupant));
    }

    removeOccupant(occupant: Occupant) {
        const index = this.occupants.findIndex(o => o.nick === occupant.nick);
        this.occupants.splice(index, 1);
    }

    ngOnDestroy(): void {
        this.selectedRoomSubscription.unsubscribe();
        this.joinedSubscription.unsubscribe();
        this.leftSubscription.unsubscribe();
        this.kickedSubscription.unsubscribe();
        this.bannedSubscription.unsubscribe();
        this.nickSubscription.unsubscribe();
    }

    async joinRoom(roomJid: string) {
        const room = await this.multiUserChatPlugin.joinRoom(jid(roomJid));
        this.selectedRoomSubject.next(room);
    }

    leaveRoom() {
        this.multiUserChatPlugin.leaveRoom(this.currentRoom.roomJid.toString());
        this.selectedRoomSubject.next(null);
        this.occupants = [];
    }

    changeRoomTopic() {
        this.multiUserChatPlugin.changeRoomTopic(this.currentRoom.roomJid.toString(), this.topic);
    }

    inviteUser() {
        this.multiUserChatPlugin.inviteUser(this.inviteJid, this.currentRoom.roomJid.toString());
    }

    changeNick() {
        this.multiUserChatPlugin.changeUserNickname(this.nick, this.currentRoom.roomJid.toString());
    }

    kick(occupant: Occupant) {
        this.multiUserChatPlugin.kickOccupant(occupant.nick, this.currentRoom.roomJid.toString());
    }

    ban(occupant: Occupant) {
        this.multiUserChatPlugin.banOccupant(occupant.jid, this.currentRoom.roomJid.toString());
    }

    grantMembership() {
        this.multiUserChatPlugin.grantMembership(this.memberJid, this.currentRoom.roomJid.toString());
    }

    revokeMembership() {
        this.multiUserChatPlugin.revokeMembership(this.memberJid, this.currentRoom.roomJid.toString());
    }

    grantModeratorStatus() {
        this.multiUserChatPlugin.grantModeratorStatus(this.moderatorJid, this.currentRoom.roomJid.toString());
    }

    revokeModeratorStatus() {
        this.multiUserChatPlugin.revokeModeratorStatus(this.moderatorJid, this.currentRoom.roomJid.toString());
    }
}
