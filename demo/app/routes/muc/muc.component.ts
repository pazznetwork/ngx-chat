import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
    CHAT_SERVICE_TOKEN,
    ChatService,
    ConnectionStates,
    MultiUserChatPlugin,
    RoomOccupant,
    Room,
    RoomSummary,
    JID,
} from '@pazznetwork/ngx-chat';
import { from, merge, Observable, Subject } from 'rxjs';
import { jid } from '@xmpp/client';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-muc',
    templateUrl: './muc.component.html',
    styleUrls: ['./muc.component.css'],
})
export class MucComponent implements OnInit, OnDestroy {
    private selectedRoomSubject = new Subject<Room>();
    selectedRoom$: Observable<Room> = this.selectedRoomSubject.asObservable();

    currentRoom: Room;

    inviteJid: string;
    subject: string;
    nick: string;
    memberJid: string;
    moderatorNick: string;

    rooms$: Observable<RoomSummary[]>;
    readonly state$: Observable<ConnectionStates> = this.chatService.state$.asObservable();

    readonly occupants = new Map<string, RoomOccupant>();

    private readonly multiUserChatPlugin: MultiUserChatPlugin;
    private readonly ngDestroySubject = new Subject<void>();

    constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit(): void {
        this.rooms$ = from(this.multiUserChatPlugin.queryAllRooms());

        this.selectedRoom$
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(room => {
                this.currentRoom = room;
            });
        this.multiUserChatPlugin.rooms$
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe((rooms) => {
                if (!this.currentRoom) {
                    return;
                }

                const updatedRoom = rooms.find((room) => room.roomJid.equals(this.currentRoom.roomJid));
                if (updatedRoom) {
                    this.selectedRoomSubject.next(updatedRoom);
                }
            });
        this.multiUserChatPlugin.onOccupantJoined$
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(occupant => {
                this.occupants.set(occupant.occupantJid.toString(), occupant);
            });
        this.multiUserChatPlugin.onOccupantChangedNick$
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(({occupant, newNick}) => {
                let existingOccupant = this.occupants.get(occupant.occupantJid.toString());
                if (!existingOccupant) {
                    existingOccupant = {...occupant};
                    existingOccupant.occupantJid = jid(occupant.occupantJid.toString());
                }
                existingOccupant.occupantJid.resource = newNick;
                existingOccupant.nick = newNick;
                this.occupants.delete(occupant.occupantJid.toString());
                this.occupants.set(existingOccupant.occupantJid.toString(), existingOccupant);
            });
        // need to explicitly pass type parameters, otherwise TS selects the wrong overload and reports a deprecation
        merge<RoomOccupant, RoomOccupant, RoomOccupant>(
            this.multiUserChatPlugin.onOccupantKicked$,
            this.multiUserChatPlugin.onOccupantBanned$,
            this.multiUserChatPlugin.onOccupantLeft$,
        )
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(occupant => this.occupants.delete(occupant.occupantJid.toString()));
    }

    ngOnDestroy(): void {
        this.ngDestroySubject.next();
        this.ngDestroySubject.complete();
    }

    async joinRoom(roomJid: JID) {
        const room = await this.multiUserChatPlugin.joinRoom(roomJid);
        this.selectedRoomSubject.next(room);
    }

    leaveRoom() {
        this.multiUserChatPlugin.leaveRoom(this.currentRoom.roomJid);
        this.selectedRoomSubject.next(null);
        this.occupants.clear();
    }

    changeRoomSubject() {
        this.multiUserChatPlugin.changeRoomSubject(this.currentRoom.roomJid, this.subject);
    }

    inviteUser() {
        this.multiUserChatPlugin.inviteUser(jid(this.inviteJid), this.currentRoom.roomJid);
    }

    changeNick() {
        this.multiUserChatPlugin.changeUserNickname(this.nick, this.currentRoom.roomJid);
    }

    kick(occupant: RoomOccupant) {
        this.multiUserChatPlugin.kickOccupant(occupant.nick, this.currentRoom.roomJid);
    }

    ban(occupant: RoomOccupant) {
        this.multiUserChatPlugin.banUser(occupant.occupantJid, this.currentRoom.roomJid);
    }

    grantMembership() {
        this.multiUserChatPlugin.grantMembership(jid(this.memberJid), this.currentRoom.roomJid);
    }

    revokeMembership() {
        this.multiUserChatPlugin.revokeMembership(jid(this.memberJid), this.currentRoom.roomJid);
    }

    grantModeratorStatus() {
        this.multiUserChatPlugin.grantModeratorStatus(this.moderatorNick, this.currentRoom.roomJid);
    }

    revokeModeratorStatus() {
        this.multiUserChatPlugin.revokeModeratorStatus(this.moderatorNick, this.currentRoom.roomJid);
    }
}
