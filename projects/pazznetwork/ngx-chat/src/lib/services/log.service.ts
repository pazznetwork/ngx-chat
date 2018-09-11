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

    public static readonly LOG_PREFIX = 'ChatService:';
    public logLevel = LogLevel.Info;
    public writer = console;

    public error(...messages: any[]) {
        if (this.logLevel >= LogLevel.Error) {
            this.writer.error(LogService.LOG_PREFIX, ...messages);
        }
    }

    public warn(...messages: any[]) {
        if (this.logLevel >= LogLevel.Warn) {
            this.writer.warn(LogService.LOG_PREFIX, ...messages);
        }
    }

    public info(...messages: any[]) {
        if (this.logLevel >= LogLevel.Info) {
            this.writer.info(LogService.LOG_PREFIX, ...messages);
        }
    }

    public debug(...messages: any[]) {
        if (this.logLevel >= LogLevel.Debug) {
            this.writer.log(LogService.LOG_PREFIX, ...messages);
        }
    }

}
