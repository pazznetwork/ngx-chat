import { LogLevel, LogService } from '../services/log.service';

export function testLogService() {
    const logService = new LogService();
    logService.logLevel = LogLevel.Warn;
    return logService;
}
