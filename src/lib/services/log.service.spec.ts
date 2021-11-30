import { LogLevel, LogService } from './log.service';

describe('log service', () => {

    let writerSpy: Console;
    let logService: LogService;

    beforeEach(() => {
        writerSpy = jasmine.createSpyObj('Console', ['error', 'warn', 'info', 'debug']);
        logService = new LogService();
        logService.writer = writerSpy;
    });

    it('should log all messages if logging is enabled', () => {
        logService.logLevel = LogLevel.Debug;
        logService.debug('debug');
        logService.info('info');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.debug).toHaveBeenCalledWith(logService.messagePrefix(), 'debug');
        expect(writerSpy.info).toHaveBeenCalledWith(logService.messagePrefix(), 'info');
        expect(writerSpy.warn).toHaveBeenCalledWith(logService.messagePrefix(), 'warn');
        expect(writerSpy.error).toHaveBeenCalledWith(logService.messagePrefix(), 'error');
    });

    it('should not log debug messages on warn level', () => {
        logService.logLevel = LogLevel.Warn;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.debug).not.toHaveBeenCalled();
        expect(writerSpy.warn).toHaveBeenCalledWith(logService.messagePrefix(), 'warn');
        expect(writerSpy.error).toHaveBeenCalledWith(logService.messagePrefix(), 'error');
    });

    it('should not log debug or warn messages on error level', () => {
        logService.logLevel = LogLevel.Error;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.debug).not.toHaveBeenCalled();
        expect(writerSpy.warn).not.toHaveBeenCalled();
        expect(writerSpy.error).toHaveBeenCalledWith(logService.messagePrefix(), 'error');
    });

    it('should not log anything if logging is disabled', () => {
        logService.logLevel = LogLevel.Disabled;
        logService.debug('debug');
        logService.warn('warn');
        logService.error('error');
        expect(writerSpy.debug).not.toHaveBeenCalled();
        expect(writerSpy.warn).not.toHaveBeenCalled();
        expect(writerSpy.error).not.toHaveBeenCalled();
    });

});
