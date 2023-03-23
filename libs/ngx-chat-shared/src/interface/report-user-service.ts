// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Contact } from './contact';

export interface ReportUserService {
  reportUser(user: Contact): void;
}
