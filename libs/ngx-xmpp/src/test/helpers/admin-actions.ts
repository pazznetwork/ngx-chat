// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteOldMamMessages, register, registeredUsers, unregister } from './ejabberd-client';
import type { AuthRequest } from '@pazznetwork/ngx-chat-shared';

export async function userIsRegistered(auth: AuthRequest): Promise<boolean> {
  const users = await registeredUsers();
  return users.includes(auth.username);
}

export async function ensureNoRegisteredUser(auth: AuthRequest): Promise<void> {
  if (await userIsRegistered(auth)) {
    await unregister(auth);
  }
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
