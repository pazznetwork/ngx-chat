// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Affiliation, AuthRequest } from '@pazznetwork/ngx-chat-shared';
import { devXmppDomain, devXmppJid, devXmppPassword } from '../../.secrets-const';
import type { RoomOptions } from './room-options';

export interface RoomAffiliation {
  username: string;
  domain: string;
  affiliation: string;
  reason: string;
}

const xmppDomain = devXmppDomain;

const adminUserName = devXmppJid;
const adminPassword = devXmppPassword;

const apiUrl = `http://${xmppDomain}:52810/api/`;

export async function getConnectedUsersNumber(): Promise<number> {
  const { num_sessions } = await executeRequest<{ num_sessions: number }>('connected_users_number');
  return num_sessions;
}

export async function getLastSeen(user: string, host: string): Promise<Date> {
  const { timestamp } = await executeRequest<{ timestamp: number }>('get_last', {
    user,
    host,
  });
  return new Date(timestamp);
}

/**
 * @deprecated can be misleading as there are silent read notifications
 */
export async function getUnreadMessageCount(user: string, server: string): Promise<number> {
  const { value } = await executeRequest<{ value: number }>('get_offline_count', {
    user,
    server,
  });
  return value;
}

export async function banAccount(user: string, host: string, reason = ''): Promise<void> {
  await executeRequest('ban_account', {
    user,
    host,
    reason,
  });
}

/**
 * Check if an account exists or not
 *
 * @param user :: string : User name to check
 * @param host :: string : Server to check
 *
 * @returns res :: integer : Status code (0 on success, 1 otherwise) as Boolean
 */
export async function checkAccountExists(user: string, host: string): Promise<boolean> {
  const value = await executeRequest('check_account', {
    user,
    host,
  });
  return !value;
}

export async function unregister({
  username: user,
  domain: host,
}: {
  username: string;
  domain: string;
}): Promise<void> {
  if (!(await checkAccountExists(user, host))) {
    return;
  }
  await executeRequest('unregister', {
    user,
    host,
  });
}

export async function removeMamForUser(user: string, server: string): Promise<void> {
  return executeRequest('remove_mam_for_user', {
    user,
    server,
  });
}

export async function register({
  username: user,
  password,
  domain: host,
}: AuthRequest): Promise<void> {
  if (await checkAccountExists(user, host)) {
    return;
  }
  return executeRequest('register', { user, password, host });
}

export async function registeredUsers(host = xmppDomain): Promise<string[]> {
  return executeRequest('registered_users', { host });
}

export async function getMucRooms(host = 'global'): Promise<string[]> {
  return executeRequest('muc_online_rooms', { host });
}

export async function changeRoomOption(
  name: string,
  service: string,
  option: string,
  value: string
): Promise<unknown> {
  return executeRequest('change_room_option', {
    name,
    service,
    option,
    value,
  });
}

export async function changePassword(
  user: string,
  password: string,
  domain: string
): Promise<unknown> {
  return executeRequest('change_password', {
    user,
    host: domain,
    newpass: password,
  });
}

export async function getRoomOptions(name: string, service: string): Promise<RoomOptions> {
  return executeRequest('get_room_options', { name, service });
}

/**
 * Changes the room option of eJabberD room
 *
 * @param name name of the room usually the project id
 * @param service usually our eJabberD server with a 'conference.' prefix
 * @param option option to change
 * @param value new value for option
 */
export async function changeRoomOptions<K extends keyof RoomOptions>(
  name: string,
  service: string,
  option: K | string,
  value: RoomOptions[K]
): Promise<void> {
  return executeRequest('change_room_option', {
    name,
    service,
    option,
    value,
  });
}

export async function getRoomAffiliations(
  name: string,
  service: string
): Promise<RoomAffiliation[]> {
  return executeRequest('get_room_affiliations', {
    name,
    service,
  });
}

export async function setRoomAffiliation(
  name: string,
  service: string,
  jid: string,
  affiliation: Affiliation
): Promise<unknown> {
  return executeRequest('set_room_affiliation', {
    name,
    service,
    jid,
    affiliation,
  });
}

export async function cleanUpJabber(domain = xmppDomain): Promise<void> {
  const rooms = await getMucRooms();
  for (const room of rooms) {
    await destroyRoom(room.split('@')[0] as string);
  }
  const registeredUsersArray = await registeredUsers();
  const usersToDelete = registeredUsersArray.filter((user) => !user.includes('admin'));
  for (const user of usersToDelete) {
    await unregister({ username: user, domain });
  }
}

export async function destroyRoom(
  room: string,
  service = 'conference.' + xmppDomain
): Promise<unknown> {
  return executeRequest('destroy_room', {
    name: room,
    service,
  });
}

export async function addContact({
  username: localuser,
  contactUsername: user,
  domain: localhost = xmppDomain,
  contactDomain: host = xmppDomain,
  nick = '',
  group = '',
  subs = '',
}: {
  username: string;
  contactUsername: string;
  domain?: string;
  contactDomain?: string;
  nick?: string;
  group?: string;
  subs?: string;
}): Promise<unknown> {
  return executeRequest('add_rosteritem', {
    localuser,
    localhost,
    user,
    host,
    nick,
    group,
    subs,
  });
}

export async function executeRequest<TReturn>(
  path: string,
  json?: Record<string, unknown>
): Promise<TReturn> {
  const headers = {} as Record<string, string>;
  headers['X-Admin'] = 'true';
  headers['Content-Type'] = 'application/json';
  headers['Authorization'] = `Basic ${btoa(String(adminUserName) + ':' + String(adminPassword))}`;
  const response = await fetch(apiUrl + path, {
    headers,
    method: 'POST',
    body: JSON.stringify(json),
  });

  return (await response.json()) as Promise<TReturn>;
}

export function deleteOldMamMessages(type = 'chat', olderThan = 0): Promise<unknown> {
  return executeRequest('delete_old_mam_messages', {
    type,
    days: olderThan,
  });
}
