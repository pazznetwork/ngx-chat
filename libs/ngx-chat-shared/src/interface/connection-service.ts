// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AuthRequest } from './auth-request';

export interface ConnectionService {
  register({ username, password, service, domain }: AuthRequest): Promise<void>;
  logIn({ username, password, service, domain }: AuthRequest): Promise<void>;
  logOut(): void;
}
