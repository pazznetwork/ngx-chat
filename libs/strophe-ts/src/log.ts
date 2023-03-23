// SPDX-License-Identifier: MIT
/** Constants: Log Level Constants
 *  Logging level indicators.
 *
 *  LogLevel.DEBUG - Debug output
 *  LogLevel.INFO - Informational output
 *  LogLevel.WARN - Warnings
 *  LogLevel.ERROR - Errors
 *  LogLevel.FATAL - Fatal errors
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/** Function: log
 *  User overrideable logging function.
 *
 *  This function is called whenever the Strophe library calls any
 *  of the logging functions.  The default implementation of this
 *  function does nothing.  If client code wishes to handle the logging
 *  messages, it should override this with
 *  > Strophe.log = function (level, msg) {
 *  >   (user code here)
 *  > };
 *
 *  The different levels and their meanings are
 *
 *    DEBUG - Messages useful for debugging purposes.
 *    INFO - Informational messages.  This is mostly information like
 *      'disconnect was called' or 'SASL auth succeeded'.
 *    WARN - Warnings about potential problems.  This is mostly used
 *      to report transient connection errors like request timeouts.
 *    ERROR - Some error occurred.
 *    FATAL - A non-recoverable fatal error occurred.
 *
 *  Parameters:
 *
 *    @param level - The log level of the log message.  This will
 *      be one of the values in Strophe.LogLevel.
 *    @param msg - The log message.
 */
export function log(level: LogLevel, msg: string): void {
  if (level === LogLevel.FATAL) {
    // eslint-disable-next-line no-console
    console?.error(msg);
  }
}

/** Functions: debug
 *  Log a message at the Strophe.LogLevel.DEBUG level.
 *
 *  Parameters:
 *
 *    @param msg - The log message.
 */
export function debug(msg: string): void {
  log(LogLevel.DEBUG, msg);
}

/** Functions: info
 *  Log a message at the Strophe.LogLevel.INFO level.
 *
 *  Parameters:
 *
 *    @param msg - The log message.
 */
export function info(msg: string): void {
  log(LogLevel.INFO, msg);
}

/** Functions: warn
 *  Log a message at the Strophe.LogLevel.WARN level.
 *
 *  Parameters:
 *
 *    @param msg - The log message.
 */
export function warn(msg: string): void {
  log(LogLevel.WARN, msg);
}

/** Functions: error
 *  Log a message at the Strophe.LogLevel.ERROR level.
 *
 *  Parameters:
 *
 *    @param msg - The log message.
 */
export function error(msg: string): void {
  log(LogLevel.ERROR, msg);
}

/** Functions: fatal
 *  Log a message at the Strophe.LogLevel.FATAL level.
 *
 *  Parameters:
 *
 *    @param msg - The log message.
 */
export function fatal(msg: string): void {
  log(LogLevel.FATAL, msg);
}
