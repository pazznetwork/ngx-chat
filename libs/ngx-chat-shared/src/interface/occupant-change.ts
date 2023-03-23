// SPDX-License-Identifier: AGPL-3.0-or-later
import type { RoomOccupant } from './room-occupant';

export type OccupantChangeType =
  | 'joined'
  | 'left'
  | 'leftOnConnectionError'
  | 'kicked'
  | 'banned'
  | 'changedNick'
  | 'lostMembership'
  | 'roomMemberOnly'
  | 'modified';

export type OccupantChange =
  | OccupantKickedOrBannedChange
  | OccupantNickChange
  | OccupantModifiedChange
  | OccupantChangeOther;

interface OccupantChangeBase {
  change: string;
  occupant: RoomOccupant;
  isCurrentUser: boolean;
}

export interface OccupantChangeOther extends OccupantChangeBase {
  change: Exclude<OccupantChangeType, 'kicked' | 'banned' | 'changedNick' | 'modified'>;
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

export interface OccupantModifiedChange extends OccupantChangeBase {
  change: 'modified';
  oldOccupant: RoomOccupant;
}
