// SPDX-License-Identifier: MIT
/**
 *  _Private_ helper class for managing timed handlers.
 *
 *  A Strophe.TimedHandler encapsulates a user provided callback that
 *  should be called after a certain period of time or at regular
 *  intervals.  The return value of the callback determines whether the
 *  Strophe.TimedHandler will continue to fire.
 *
 *  Users will not use Strophe.TimedHandler objects directly, but instead
 *  they will use Strophe.Connection.addTimedHandler() and
 *  Strophe.Connection.deleteTimedHandler().
 */
export class TimedHandler {
  lastCalled: number;

  /**
   *  Create and initialize a new Strophe.TimedHandler object.
   *
   *  Parameters:
   *
   *    @param period - The number of milliseconds to wait before the
   *      handler is called.
   *    @param handler - The callback to run when the handler fires.  This
   *      function should take no arguments.
   *    @param user - is this a user created handler
   *
   *  Returns:
   *    @returns A new Strophe.TimedHandler object.
   */
  constructor(
    readonly period: number,
    private readonly handler: () => boolean,
    readonly user = true
  ) {
    this.lastCalled = new Date().getTime();
  }

  /**
   *  Run the callback for the Strophe.TimedHandler.
   *
   *  Returns:
   *
   *   @returns true if the Strophe.TimedHandler should be called again, and false
   *      otherwise.
   */
  run(): boolean {
    this.lastCalled = new Date().getTime();
    return this.handler();
  }

  /**
   *  Reset the last called time for the Strophe.TimedHandler.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private reset(): void {
    this.lastCalled = new Date().getTime();
  }

  /**
   *  Get a string representation of the Strophe.TimedHandler object.
   *
   *  Returns:
   *    The string representation.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private toString(): string {
    return `{TimedHandler: ${this.handler.toString()}(${this.period})}`;
  }
}
