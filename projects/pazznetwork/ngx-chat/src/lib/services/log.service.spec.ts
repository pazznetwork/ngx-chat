import { LogLevel, LogService } from './log.service';

describe('log service', () => {

    let writerSpy: Console;
    let logService: LogService;

    beforeEach(() => {
        writerSpy = jasmine.createSpyObj('Console', ['error', 'warn', 'info', 'log']);
        logService = new LogService();
        logService.writer = writerSpy;
    });

    it('should log all messages if logging is enabled', () => {
        logService.logLevel = LogLevel.Debug;
        logService.debug('debug');
        logService.info('info');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.log).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'debug');
        expect(writerSpy.info).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'info');
        expect(writerSpy.warn).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'warn');
        expect(writerSpy.error).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'error');
    });

    it('should not log debug messages on warn level', () => {
        logService.logLevel = LogLevel.Warn;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.log).not.toHaveBeenCalled();
        expect(writerSpy.warn).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'warn');
        expect(writerSpy.error).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'error');
    });

    it('should not log debug or warn messages on error level', () => {
        logService.logLevel = LogLevel.Error;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.log).not.toHaveBeenCalled();
        expect(writerSpy.warn).not.toHaveBeenCalled();
        expect(writerSpy.error).toHaveBeenCalledWith(LogService.LOG_PREFIX, 'error');
    });

    it('should not log anything if logging is disabled', () => {
        logService.logLevel = LogLevel.Disabled;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.log).not.toHaveBeenCalled();
        expect(writerSpy.warn).not.toHaveBeenCalled();
        expect(writerSpy.error).not.toHaveBeenCalled();
    });

});
