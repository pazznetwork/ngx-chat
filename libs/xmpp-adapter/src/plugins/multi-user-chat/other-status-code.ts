// SPDX-License-Identifier: MIT
/* https://xmpp.org/extensions/xep-0045.html#registrar-statuscodes-init
 * ----------------------------------------
 * 100 message      Entering a room         Inform user that any occupant is allowed to see the user's full JID
 * 101 message (out of band)                     Affiliation change  Inform user that his or her affiliation changed while not in the room
 * 102 message      Configuration change         Inform occupants that room now shows unavailable members
 * 103 message      Configuration change         Inform occupants that room now does not show unavailable members
 * 104 message      Configuration change         Inform occupants that a non-privacy-related room configuration change has occurred
 * 110 presence     Any room presence       Inform user that presence refers to one of its own room occupants
 * 170 message or initial presence               Configuration change    Inform occupants that room logging is now enabled
 * 171 message      Configuration change         Inform occupants that room logging is now disabled
 * 172 message      Configuration change         Inform occupants that the room is now non-anonymous
 * 173 message      Configuration change         Inform occupants that the room is now semi-anonymous
 * 174 message      Configuration change         Inform occupants that the room is now fully-anonymous
 * 201 presence     Entering a room         Inform user that a new room has been created
 * 210 presence     Entering a room         Inform user that the service has assigned or modified the occupant's roomnick
 * 301 presence     Removal from room       Inform user that he or she has been banned from the room
 * 303 presence     Exiting a room          Inform all occupants of new room nickname
 * 307 presence     Removal from room       Inform user that he or she has been kicked from the room
 * 321 presence     Removal from room       Inform user that he or she is being removed from the room because of an affiliation change
 * 322 presence     Removal from room       Inform user that he or she is being removed from the room because the room has been changed to members-only and the user is not a member
 * 332 presence     Removal from room       Inform user that he or she is being removed from the room because of a system shutdown
 *
 * 'visibility_changes': ['100', '102', '103', '172', '173', '174'],
 * 'self': ['110'],
 * 'non_privacy_changes': ['104', '201'],
 * 'muc_logging_changes': ['170', '171'],
 * 'nickname_changes': ['210', '303'],
 * 'disconnected': ['301', '307', '321', '322', '332', '333'],
 */
export enum OtherStatusCode {
  AffiliationChange = '101',
  PresenceSelfRef = '110',
  // in Other as you don't leave the room upon nickName change
  NewNickNameInRoom = '303',
}
