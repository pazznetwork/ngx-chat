// SPDX-License-Identifier: MIT
import type { AuthenticationMode } from './authentication-mode';

export interface ConnectionSettings {
  discoverConnectionMethods: boolean;
  authenticationMode: AuthenticationMode;
  credentialsUrl: string;
  prebindUrl: string;
}
