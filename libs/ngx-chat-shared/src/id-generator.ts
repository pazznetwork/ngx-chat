// SPDX-License-Identifier: AGPL-3.0-or-later
export function id(): string {
  let i;
  while (!i) {
    i = Math.random().toString(36).substring(2, 12);
  }
  return i;
}
