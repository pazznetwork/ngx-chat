// SPDX-License-Identifier: AGPL-3.0-or-later
import { type Log, LogLevel } from '@pazznetwork/ngx-chat-shared';

export class LogService implements Log {
  logLevel = LogLevel.Info;
  writer = console;
  messagePrefix = (): string => 'ChatService:';

  error(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Error) {
      this.writer.error(this.messagePrefix(), ...messages);
    }
  }

  warn(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Warn) {
      this.writer.warn(this.messagePrefix(), ...messages);
    }
  }

  info(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Info) {
      this.writer.info(this.messagePrefix(), ...messages);
    }
  }

  debug(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Debug) {
      this.writer.debug(this.messagePrefix(), ...messages);
    }
  }
}
