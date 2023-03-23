// SPDX-License-Identifier: AGPL-3.0-or-later
export interface AuthRequest {
  service?: string;
  domain: string;
  username: string;
  password: string;
}
