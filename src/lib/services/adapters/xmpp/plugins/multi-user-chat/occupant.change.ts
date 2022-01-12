import { RoomOccupant } from './room.occupant';

export type OccupantChangeType = 'joined' | 'left' | 'kicked' | 'banned' | 'changedNick' | 'invitation';

export interface OccupantChange {
    occupant: RoomOccupant;
    change: OccupantChangeType;
    newNick?: string;
}
