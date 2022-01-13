import { RoomOccupant } from './room.occupant';

export type OccupantChangeType =
    'joined'
    | 'left'
    | 'kicked'
    | 'banned'
    | 'changedNick'
    | 'invitation'
    | 'revokedMembership';

export interface OccupantChange {
    occupant: RoomOccupant;
    change: OccupantChangeType;
    newNick?: string;
}
