// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LogLevel } from './log-level';

export interface Log {
  logLevel: LogLevel;
  writer: Console;
  messagePrefix: () => string;

  error(...messages: any[]): void;

  warn(...messages: any[]): void;

  info(...messages: any[]): void;

  debug(...messages: any[]): void;
}
