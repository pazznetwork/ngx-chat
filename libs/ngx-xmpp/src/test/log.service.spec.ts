// SPDX-License-Identifier: AGPL-3.0-or-later
import { LogLevel } from '@pazznetwork/ngx-chat-shared';
import { LogService } from '../services/log.service';

describe('log service', () => {
  let logService: LogService;

  beforeEach(() => {
    logService = new LogService();
  });

  it('should log all messages if logging is enabled', () => {
    logService.logLevel = LogLevel.Debug;

    spyOn(logService.writer, 'debug').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('debug');
    });
    spyOn(logService.writer, 'info').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('info');
    });
    spyOn(logService.writer, 'warn').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('warn');
    });
    spyOn(logService.writer, 'error').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('error');
    });

    logService.debug('debug');
    logService.info('info');
    logService.warn('warn');
    logService.error('error');
  });

  it('should not log debug messages on warn level', () => {
    logService.logLevel = LogLevel.Warn;

    spyOn(logService.writer, 'debug').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'info').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'warn').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('warn');
    });
    spyOn(logService.writer, 'error').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('error');
    });

    logService.debug('debug');
    logService.warn('warn');
    logService.error('error');
  });

  it('should not log debug or warn messages on error level', () => {
    logService.logLevel = LogLevel.Error;

    spyOn(logService.writer, 'debug').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'info').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'warn').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'error').and.callFake((prefix: unknown, msg: unknown) => {
      expect(prefix).toContain(logService.messagePrefix());
      expect(msg).toContain('error');
    });

    logService.debug('debug');
    logService.warn('warn');
    logService.error('error');
  });

  it('should not log anything if logging is disabled', () => {
    logService.logLevel = LogLevel.Disabled;

    spyOn(logService.writer, 'debug').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'info').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'warn').and.callFake(() => {
      fail();
    });
    spyOn(logService.writer, 'error').and.callFake(() => {
      fail();
    });

    logService.debug('debug');
    logService.warn('warn');
    logService.error('error');
  });
});
