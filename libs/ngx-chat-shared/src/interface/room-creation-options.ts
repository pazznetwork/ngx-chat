// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * see:
 * https://xmpp.org/extensions/xep-0045.html#terms-rooms
 */
export interface RoomCreationOptions extends RoomConfiguration {
  /**
   * The room id to create the room with. This is the `local` part of the room JID.
   */
  roomId: string;
  /**
   * Optional nickname to use in the room. Current user's nickname will be used if not provided.
   */
  nick?: string;
}

export interface RoomConfiguration {
  /**
   * Optional name for the room. If none is provided, room will be only identified by its JID.
   */
  name?: string;
  /**
   * A room that can be found by any user through normal means such as searching and service discovery
   */
  public?: boolean;
  /**
   * for true:
   * A room that a user cannot enter without being on the member list.
   * for false:
   * A room that non-banned entities are allowed to enter without being on the member list.
   */
  membersOnly?: boolean;
  /**
   * for true:
   * A room in which an occupant's full JID is exposed to all other occupants,
   * although the occupant can request any desired room nickname.
   * for false:
   * A room in which an occupant's full JID can be discovered by room moderators only.
   */
  nonAnonymous?: boolean;
  /**
   * for true:
   * A room that is not destroyed if the last occupant exits.
   * for false:
   * A room that is destroyed if the last occupant exits.
   */
  persistentRoom?: boolean;
  /**
   * allow ejabberd MucSub subscriptions.
   * Room occupants are allowed to subscribe to message notifications being archived while they were offline
   */
  allowSubscription?: boolean;

  /**
   * Only occupants with "voice" can send public messages. The default value is true.
   */
  moderated?: boolean;
}
