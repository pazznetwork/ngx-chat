import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
    CHAT_SERVICE_TOKEN,
    ChatService,
    ConnectionStates,
    JID,
    MultiUserChatPlugin,
    OccupantChange,
    Room,
    RoomOccupant,
    RoomSummary
} from '@pazznetwork/ngx-chat';
import { from, merge, Observable, Subject } from 'rxjs';
import { jid } from '@xmpp/client';
import { filter, share, switchMap, takeUntil } from 'rxjs/operators';

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

    occupants$: Observable<RoomOccupant[]>;

    private readonly multiUserChatPlugin: MultiUserChatPlugin;
    private readonly ngDestroySubject = new Subject<void>();
    private currentUser: {
        domain?: string;
        service?: string;
        password?: string;
        username?: string;
    };

    constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {
        this.multiUserChatPlugin = chatService.getPlugin(MultiUserChatPlugin);
    }

    ngOnInit(): void {
        this.currentUser = JSON.parse(localStorage.getItem('data')) || {};

        this.rooms$ = from(this.multiUserChatPlugin.queryAllRooms());

        this.selectedRoom$
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(room => {
                this.currentRoom = room;
            });

        this.occupants$ = this.selectedRoom$.pipe(
            filter(room => room !== null),
            switchMap(room => room.occupants$),
            takeUntil(this.ngDestroySubject),
        );

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

        const onOccupantChanged$ = this.selectedRoom$.pipe(
            filter(room => room !== null),
            switchMap((room) => room.onOccupantChanged$),
            share(),
        );
        onOccupantChanged$
            .pipe(
                filter(({change}) => change === 'joined'),
                takeUntil(this.ngDestroySubject)
            )
            .subscribe(({occupant}) => {
                console.log('joined', occupant);
            });

        onOccupantChanged$
            .pipe(
                filter(({change}) => change === 'changedNick'),
                takeUntil(this.ngDestroySubject)
            )
            .subscribe(({occupant, newNick}) => {
                console.log('changed nick', occupant, newNick);
                if (this.isOccupantCurrentUser(occupant)) {
                    this.currentUser.username = newNick;
                }
            });

        // need to explicitly pass type parameters, otherwise TS selects the wrong overload and reports a deprecation
        merge<OccupantChange, OccupantChange, OccupantChange>(
            onOccupantChanged$.pipe(
                filter(({change}) => change === 'kicked'),
            ),
            onOccupantChanged$.pipe(
                filter(({change}) => change === 'banned'),
            ),
            onOccupantChanged$.pipe(
                filter(({change}) => change === 'left'),
            ),
        )
            .pipe(takeUntil(this.ngDestroySubject))
            .subscribe(({occupant, change}) => {
                console.log(occupant, change);
                if (this.isOccupantCurrentUser(occupant)) {
                    this.selectedRoomSubject.next(null);
                }
            });
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

    private isOccupantCurrentUser(occupant: RoomOccupant) {
        return this.currentUser.username === occupant.nick;
    }
}
