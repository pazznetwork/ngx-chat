import { Injectable } from '@angular/core';

export enum LogLevel {
    Disabled = 0,
    Error,
    Warn,
    Info,
    Debug,
}

@Injectable()
export class LogService {

    public logLevel = LogLevel.Info;
    public writer = console;
    public messagePrefix = () => 'ChatService:';

    public error(...messages: any[]) {
        if (this.logLevel >= LogLevel.Error) {
            this.writer.error(this.messagePrefix(), ...messages);
        }
    }

    public warn(...messages: any[]) {
        if (this.logLevel >= LogLevel.Warn) {
            this.writer.warn(this.messagePrefix(), ...messages);
        }
    }

    public info(...messages: any[]) {
        if (this.logLevel >= LogLevel.Info) {
            this.writer.info(this.messagePrefix(), ...messages);
        }
    }

    public debug(...messages: any[]) {
        if (this.logLevel >= LogLevel.Debug) {
            this.writer.debug(this.messagePrefix(), ...messages);
        }
    }

}
