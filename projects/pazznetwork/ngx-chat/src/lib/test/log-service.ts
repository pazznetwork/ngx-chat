import { LogLevel, LogService } from '../services/log.service';
import { currentSpecReporter } from './reporter.spec';

export function testLogService() {
    const logService = new LogService();
    logService.logLevel = LogLevel.Warn;
    logService.messagePrefix = () => `Chat Service (in ${currentSpecReporter.currentSpec.fullName}):`;
    return logService;
}
