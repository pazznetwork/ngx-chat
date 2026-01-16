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
// const devXmppDomain = 'localhost';
const devXmppDomain = 'local-jabber.entenhausen.pazz.de';

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
  if (!Array.isArray(users)) {
    console.warn('[Cleanup] Warn: registeredUsers returned non-array:', users);
    return;
  }
  const testPrefixes = ['hero', 'villain', 'princess', 'father', 'friend', 'test'];
  const usersToUnregister = users?.filter((user) =>
    !user.includes('admin') &&
    testPrefixes.some(prefix => user.startsWith(prefix))
  );

  if (usersToUnregister && usersToUnregister.length > 50) {
    console.warn(`[Cleanup] Warn: Found ${usersToUnregister.length} test users to delete. This might take a while.`);
  }

  for (const user of usersToUnregister) {
    await unregisterUnsafe({ username: user, domain });
  }
}

export async function destroyAllRooms(): Promise<void> {
  console.warn('[Cleanup] Warn: destroyAllRooms is deprecated as it might affect other running tests (e.g. E2E). Use destroyRoomsByPrefixes instead.');
  const rooms = await getMucRooms();
  for (const room of rooms) {
    const [name, service] = room.split('@');
    await destroyRoom(name as string, service);
  }
}

export async function destroyRoomsByPrefixes(prefixes: string[]): Promise<void> {
  const rooms = await getMucRooms();
  if (!Array.isArray(rooms)) {
    console.warn('[Cleanup] Warn: getMucRooms returned non-array:', rooms);
    return;
  }
  const roomsToDestroy = rooms.filter(room => {
    const [name] = room.split('@');
    return prefixes.some(prefix => name && name.toLowerCase().startsWith(prefix.toLowerCase()));
  });

  if (roomsToDestroy.length > 0) {
    console.log(`[Cleanup] Found ${roomsToDestroy.length} rooms to destroy matching prefixes: ${prefixes.join(', ')}`);
  }

  await Promise.all(roomsToDestroy.map(async (room) => {
    const [name, service] = room.split('@');
    try {
      await destroyRoom(name as string, service);
    } catch (e) {
      // ignore
    }
  }));
}

export async function cleanServerBesidesAdmin(): Promise<void> {
  await unregisterAllBesidesAdmin();
  // Safe prefixes used in unit tests (TestUtils)
  const safePrefixes = [
    'heroRoom',
    'villainRoom',
    'princessRoom',
    'fatherRoom',
    'friendRoom',
    'configtestroom',
    'chatroom',
    'scrollroom',
    'test-room'
  ];
  await destroyRoomsByPrefixes(safePrefixes);
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
