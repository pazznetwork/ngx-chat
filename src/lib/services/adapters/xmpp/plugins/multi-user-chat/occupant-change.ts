import { RoomOccupant } from './room-occupant';

export type OccupantChangeType =
    | 'joined'
    | 'left'
    | 'leftOnConnectionError'
    | 'kicked'
    | 'banned'
    | 'changedNick'
    | 'lostMembership'
    | 'modified';

export type OccupantChange = OccupantKickedOrBannedChange | OccupantNickChange | OccupantChangeOther;

interface OccupantChangeBase {
    change: string;
    occupant: RoomOccupant;
    isCurrentUser: boolean;
}

export interface OccupantChangeOther extends OccupantChangeBase {
    change: Exclude<OccupantChangeType, 'kicked' | 'banned' | 'changedNick'>;
}

export interface OccupantKickedOrBannedChange extends OccupantChangeBase {
    change: 'kicked' | 'banned';
    actor?: string;
    reason?: string;
}

export interface OccupantNickChange extends OccupantChangeBase {
    change: 'changedNick';
    newNick: string;
}

export interface OccupantModified {
    occupant: RoomOccupant;
    oldOccupant: RoomOccupant;
    isCurrentUser: boolean;
}

