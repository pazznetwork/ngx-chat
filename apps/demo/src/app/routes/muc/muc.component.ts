// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { from, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs/operators';
import { ChatService, JID, Room, RoomOccupant } from '@pazznetwork/ngx-chat-shared';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
  selector: 'ngx-chat-muc',
  templateUrl: './muc.component.html',
  styleUrls: ['./muc.component.css'],
})
export class MucComponent implements OnInit, OnDestroy {
  private selectedRoomSubject = new Subject<Room | null>();
  selectedRoom$: Observable<Room> = this.selectedRoomSubject
    .asObservable()
    .pipe(filter((room) => room != null)) as Observable<Room>;

  currentRoom?: Room;

  inviteJid = '';
  subject = '';
  nick = '';
  memberJid = '';
  moderatorNick = '';

  rooms$?: Observable<Room[]>;

  occupants$?: Observable<RoomOccupant[]>;

  private readonly ngDestroySubject = new Subject<void>();

  constructor(@Inject(CHAT_SERVICE_TOKEN) private chatService: ChatService) {}

  ngOnInit(): void {
    this.rooms$ = from(this.chatService.roomService.queryAllRooms());

    this.selectedRoom$.pipe(takeUntil(this.ngDestroySubject)).subscribe((room) => {
      this.currentRoom = room;
    });

    this.occupants$ = this.selectedRoom$.pipe(
      switchMap((room) => room.occupants$),
      takeUntil(this.ngDestroySubject)
    );

    this.chatService.roomService.rooms$
      .pipe(takeUntil(this.ngDestroySubject))
      .subscribe((rooms) => {
        if (!this.currentRoom) {
          return;
        }

        const updatedRoom = rooms.find((room) => room.jid.equals(this.currentRoom?.jid));
        if (updatedRoom) {
          this.selectedRoomSubject.next(updatedRoom);
        }
      });

    const occupantChanges$ = this.selectedRoom$.pipe(
      distinctUntilChanged(
        (r1, r2) => (r1 == null && r2 == null) || Boolean(r1?.equals(r2) || r2?.equals(r1))
      ),
      filter((room) => room != null),
      switchMap((room) => room.onOccupantChange$)
    );

    occupantChanges$.pipe(takeUntil(this.ngDestroySubject)).subscribe((occupantChange) => {
      const { change, occupant, isCurrentUser } = occupantChange;
      if (occupantChange.change === 'modified') {
        // eslint-disable-next-line no-console
        console.log(
          `change=${change}, modified=${occupant.jid.toString()}, currentUser=${String(
            isCurrentUser
          )}`,
          occupant,
          occupantChange.oldOccupant
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`change=${change}, currentUser=${String(isCurrentUser)}`, occupant);
      }
    });

    occupantChanges$
      .pipe(
        filter(
          ({ change, isCurrentUser }) =>
            (change === 'kicked' ||
              change === 'banned' ||
              change === 'left' ||
              change === 'leftOnConnectionError' ||
              change === 'lostMembership') &&
            isCurrentUser
        ),
        takeUntil(this.ngDestroySubject)
      )
      .subscribe(() => {
        this.selectedRoomSubject.next(null);
      });
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
    this.ngDestroySubject.complete();
  }

  async joinRoom(roomJid: JID): Promise<void> {
    const room = await this.chatService.roomService.joinRoom(roomJid.toString());
    this.selectedRoomSubject.next(room);
  }

  async leaveRoom(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.leaveRoom(this.currentRoom.jid.toString());
    this.selectedRoomSubject.next(null);
  }

  async changeRoomSubject(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.changeRoomSubject(
      this.currentRoom.jid.toString(),
      this.subject
    );
  }

  async inviteUser(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.inviteUserToRoom(
      this.inviteJid,
      this.currentRoom.jid.toString()
    );
  }

  async changeNick(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.changeUserNicknameForRoom(
      this.nick,
      this.currentRoom.jid.toString()
    );
  }

  async kick(occupant: RoomOccupant): Promise<void> {
    if (!occupant.nick) {
      throw new Error(`occupant.nick is undefined`);
    }
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.kickFromRoom(occupant.nick, this.currentRoom.jid.toString());
  }

  async ban(occupant: RoomOccupant): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.banUserForRoom(
      occupant.jid.toString(),
      this.currentRoom?.jid.toString()
    );
  }

  async grantMembership(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.grantMembershipForRoom(
      this.memberJid,
      this.currentRoom?.jid.toString()
    );
  }

  async revokeMembership(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.revokeMembershipForRoom(
      this.memberJid,
      this.currentRoom?.jid.toString()
    );
  }

  async grantModeratorStatus(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.grantModeratorStatusForRoom(
      this.moderatorNick,
      this.currentRoom?.jid.toString()
    );
  }

  async revokeModeratorStatus(): Promise<void> {
    if (!this.currentRoom?.jid) {
      throw new Error('current room is undefined');
    }
    await this.chatService.roomService.revokeModeratorStatusForRoom(
      this.moderatorNick,
      this.currentRoom?.jid.toString()
    );
  }
}
