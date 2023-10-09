// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  deleteOldMamMessages,
  destroyRoom,
  getMucRooms,
  register,
  registeredUsers,
  unregister,
  unregisterUnsafe,
} from './ejabberd-client';
import type { AuthRequest } from '@pazznetwork/ngx-chat-shared';
import { devXmppDomain } from '../../.secrets-const';

export async function userIsRegistered(auth: AuthRequest): Promise<boolean> {
  const users = await registeredUsers();
  return users ? users.includes(auth.username) : false;
}

export async function ensureNoRegisteredUser(auth: AuthRequest): Promise<void> {
  if (await userIsRegistered(auth)) {
    await unregister(auth);
  }
}

export async function unregisterAllBesidesAdmin(domain = devXmppDomain): Promise<void> {
  const users = await registeredUsers();
  const usersToUnregister = users?.filter((user) => !user.includes('admin'));
  for (const user of usersToUnregister) {
    await unregisterUnsafe({ username: user, domain });
  }
}

export async function destroyAllRooms(): Promise<void> {
  const rooms = await getMucRooms();
  for (const room of rooms) {
    const [name, service] = room.split('@');
    await destroyRoom(name as string, service);
  }
}

export async function cleanServerBesidesAdmin(): Promise<void> {
  await unregisterAllBesidesAdmin();
  await destroyAllRooms();
}

export async function ensureRegisteredUser(auth: AuthRequest): Promise<void> {
  if (await userIsRegistered(auth)) {
    return;
  }
  await register(auth);
}

export async function deleteMamChatMessages(): Promise<void> {
  await deleteOldMamMessages();
}
