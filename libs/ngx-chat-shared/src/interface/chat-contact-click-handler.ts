// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Recipient } from './recipient';

export interface ChatContactClickHandler {
  onClick(contact: Recipient): void;
}
