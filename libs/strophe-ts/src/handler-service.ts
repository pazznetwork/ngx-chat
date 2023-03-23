// SPDX-License-Identifier: MIT
import { TimedHandler } from './timed-handler';
import { Handler } from './handler';
import { HandlerAsync } from './handler-async';
import { warn } from './log';
import { $iq } from './stanza/builder-helper';
import { NS } from './stanza/namespace';
import type { Connection } from './connection';

export class HandlerService {
  // handler lists
  handlersTimed: TimedHandler[] = [];
  handlers: Handler[] = [];
  handlersAsync: HandlerAsync[] = [];

  removeTimedHandlers: TimedHandler[] = [];
  removeHandlers: Handler[] = [];
  removeHandlersAsync: HandlerAsync[] = [];

  addTimedHandlers: TimedHandler[] = [];
  addHandlers: Handler[] = [];
  addHandlersAsync: HandlerAsync[] = [];

  private iqFallbackHandler: Handler = new Handler(
    (iq) => {
      const id = iq.getAttribute('id');
      const attrs = id ? { type: 'error', id } : ({ type: 'error' } as Record<string, string>);
      this.connection.send(
        $iq(attrs).c('error', { type: 'cancel' }).c('service-unavailable', { xmlns: NS.STANZAS })
      );
      return false;
    },
    undefined,
    'iq',
    ['get', 'set']
  );

  constructor(readonly connection: Connection) {}

  resetHandlers(): void {
    this.handlersTimed = [];
    this.handlers = [];
    this.handlersAsync = [];
    this.removeTimedHandlers = [];
    this.removeHandlers = [];
    this.removeHandlersAsync = [];
    this.addTimedHandlers = [];
    this.addHandlers = [];
    this.addHandlersAsync = [];
  }

  async checkHandlerChain(child: Element): Promise<void> {
    const matches = [];
    this.handlers = this.handlers.reduce((handlers: Handler[], handler) => {
      try {
        if (handler.isMatch(child)) {
          if (handler.run(child)) {
            handlers.push(handler);
          }
          matches.push(handler);
        } else {
          handlers.push(handler);
        }
      } catch (e) {
        // if the handler throws an exception, we consider it as false
        warn('Removing Strophe handlers due to uncaught exception: ' + (e as Error).message);
      }

      return handlers;
    }, []);

    const keptHandlers: HandlerAsync[] = [];
    for (const handlerAsync of this.handlersAsync) {
      try {
        if (handlerAsync.isMatch(child)) {
          if (await handlerAsync.run(child)) {
            keptHandlers.push(handlerAsync);
          }
          matches.push(handlerAsync);
        } else {
          keptHandlers.push(handlerAsync);
        }
      } catch (e) {
        // if the handler throws an exception, we consider it as false
        warn('Removing Strophe handlers due to uncaught exception: ' + (e as Error).message);
      }
    }
    this.handlersAsync = keptHandlers;

    // If no handler was fired for an incoming IQ with type="set",
    // then we return an IQ error stanza with service-unavailable.
    if (!matches.length && this.iqFallbackHandler.isMatch(child)) {
      this.iqFallbackHandler.run(child);
    }
  }

  /**
   *  Add a timed handler to the connection.
   *
   *  This function adds a timed handler.  The provided handler will
   *  be called every period milliseconds until it returns false,
   *  the connection is terminated, or the handler is removed.  Handlers
   *  that wish to continue being invoked should return true.
   *
   *  Because of method binding it is necessary to save the result of
   *  this function if you wish to remove a handler with
   *  deleteTimedHandler().
   *
   *  Note that user handlers are not active until authentication is
   *  successful.
   *
   *  Parameters:
   *
   *    @param period - The period of the handler.
   *    @param handler - The callback function.
   *
   *  Returns:
   *    @returns A reference to the handler that can be used to remove it.
   */
  addTimedHandler(period: number, handler: () => boolean): TimedHandler {
    const thand = new TimedHandler(period, handler);
    this.addTimedHandlers.push(thand);
    return thand;
  }

  /**
   *  Delete a timed handler for a connection.
   *
   *  This function removes a timed handler from the connection.  The
   *  handRef parameter is *not* the function passed to addTimedHandler(),
   *  but is the reference returned from addTimedHandler().
   *
   *  Parameters:
   *
   *    @param handRef - The handler reference.
   */
  deleteTimedHandler(handRef: TimedHandler): void {
    // this must be done in the Idle loop so that we don't change
    // the handlers during iteration
    this.removeTimedHandlers.push(handRef);
  }

  /**
   *  Delete a stanza handler for a connection.
   *
   *  This function removes a stanza handler from the connection.  The
   *  handRef parameter is *not* the function passed to addHandler(),
   *  but is the reference returned from addHandler().
   *
   *  Parameters:
   *
   *    @param handRef - The handler reference.
   */
  deleteHandler(handRef: Handler): void {
    // this must be done in the Idle loop so that we don't change
    // the handlers during iteration
    this.removeHandlers.push(handRef);
    // If a handler is being deleted while it is being added,
    // prevent it from getting added
    const i = this.addHandlers.indexOf(handRef);
    if (i >= 0) {
      this.addHandlers.splice(i, 1);
    }
  }

  /**
   *  Add a stanza handler for the connection.
   *
   *  This function adds a stanza handler to the connection.  The
   *  handler callback will be called for any stanza that matches
   *  the parameters.  Note that if multiple parameters are supplied,
   *  they must all match for the handler to be invoked.
   *
   *  The handler will receive the stanza that triggered it as its argument.
   *  *The handler should return true if it is to be invoked again;
   *  returning false will remove the handler after it returns.*
   *
   *  As a convenience, the ns parameters applies to the top level element
   *  and also any of its immediate children.  This is primarily to make
   *  matching /iq/query elements easy.
   *
   *  Options
   *  ~~~~~~~
   *  With the options argument, you can specify boolean flags that affect how
   *  matches are being done.
   *
   *  Currently two flags exist:
   *
   *  - matchBareFromJid:
   *      When set to true, the from parameter and the
   *      from attribute on the stanza will be matched as bare JIDs instead
   *      of full JIDs. To use this, pass {matchBareFromJid: true} as the
   *      value of options. The default value for matchBareFromJid is false.
   *
   *  - ignoreNamespaceFragment:
   *      When set to true, a fragment specified on the stanza's namespace
   *      URL will be ignored when it's matched with the one configured for
   *      the handler.
   *
   *      This means that if you register like this:
   *      >   connection.addHandler(
   *      >       handler,
   *      >       'http://jabber.org/protocol/muc',
   *      >       null, null, null, null,
   *      >       {'ignoreNamespaceFragment': true}
   *      >   );
   *
   *      Then a stanza with XML namespace of
   *      'http://jabber.org/protocol/muc#user' will also be matched. If
   *      'ignoreNamespaceFragment' is false, then only stanzas with
   *      'http://jabber.org/protocol/muc' will be matched.
   *
   *  Deleting the handler
   *  ~~~~~~~~~~~~~~~~~~~~
   *  The return value should be saved if you wish to remove the handler
   *  with deleteHandler().
   *
   *  Parameters:
   *
   *    @param handler - The user callback.
   *    @param ns - The namespace to match.
   *    @param name - The stanza tag name to match.
   *    @param type - The stanza type (or types if an array) to match.
   *    @param id - The stanza id attribute to match.
   *    @param from - The stanza from attribute to match.
   *    @param options - The handler options
   *
   *  Returns:
   *    @returns A reference to the handler that can be used to remove it.
   */
  addHandler(
    handler: (stanza: Element) => boolean,
    ns?: string,
    name?: string,
    type?: string | string[],
    id?: string,
    from?: string,
    options?: { matchBareFromJid: boolean; ignoreNamespaceFragment: boolean }
  ): Handler {
    const hand = new Handler(handler, ns, name, type, id, from, options);
    this.addHandlers.push(hand);
    return hand;
  }

  addHandlerAsync(
    handler: (stanza: Element) => Promise<boolean>,
    ns?: string,
    name?: string,
    type?: string | string[],
    id?: string,
    from?: string,
    options?: { matchBareFromJid: boolean; ignoreNamespaceFragment: boolean }
  ): HandlerAsync {
    const hand = new HandlerAsync(handler, ns, name, type, id, from, options);
    this.addHandlersAsync.push(hand);
    return hand;
  }

  /**
   *  Delete a stanza handler for a connection.
   *
   *  This function removes a stanza handler from the connection.  The
   *  handRef parameter is *not* the function passed to addHandler(),
   *  but is the reference returned from addHandler().
   *
   *  Parameters:
   *
   *    @param handRef - The handler reference.
   */
  deleteHandlerAsync(handRef: HandlerAsync): void {
    // this must be done in the Idle loop so that we don't change
    // the handlers during iteration
    this.removeHandlersAsync.push(handRef);
    // If a handler is being deleted while it is being added,
    // prevent it from getting added
    const i = this.addHandlersAsync.indexOf(handRef);
    if (i >= 0) {
      this.addHandlersAsync.splice(i, 1);
    }
  }

  /**
   *  This function is used to add a Strophe.TimedHandler for the
   *  library code.  System timed handlers are allowed to run before
   *  authentication is complete.
   *
   *  Parameters:
   *    (Integer) period - The period of the handler.
   *    (Function) handler - The callback function.
   */
  addSysTimedHandler(period: number, handler: () => boolean): TimedHandler {
    const timedHandler = new TimedHandler(period, handler, false);
    this.addTimedHandlers.push(timedHandler);
    return timedHandler;
  }

  removeScheduledHandlers(): void {
    // remove handlers scheduled for deletion
    while (this.removeHandlers.length > 0) {
      const hand = this.removeHandlers.pop();
      const i = this.handlers.indexOf(hand as Handler);
      if (i >= 0) {
        this.handlers.splice(i, 1);
      }
    }

    // remove handlers scheduled for deletion
    while (this.removeHandlersAsync.length > 0) {
      const hand = this.removeHandlersAsync.pop();
      const i = this.handlersAsync.indexOf(hand as HandlerAsync);
      if (i >= 0) {
        this.handlersAsync.splice(i, 1);
      }
    }
  }

  /**
   *  This function is used to add a Handler for the
   *  library code.  System stanza handlers are allowed to run before
   *  authentication is complete.
   *
   *  Parameters:
   *
   *    @param handler - The callback function.
   *    @param ns - The namespace to match.
   *    @param name - The stanza name to match.
   *    @param type - The stanza type attribute to match.
   *    @param id - The stanza id attribute to match.
   */
  addSysHandler(
    handler: (element: Element) => boolean,
    ns?: string,
    name?: string,
    type?: string,
    id?: string
  ): Handler {
    const hand = new Handler(handler, ns, name, type, id, undefined, undefined, false);
    this.addHandlers.push(hand);
    return hand;
  }

  /**
   *  This function is used to add a Handler for the
   *  library code.  System stanza handlers are allowed to run before
   *  authentication is complete.
   *
   *  Parameters:
   *
   *    @param handler - The callback function.
   *    @param ns - The namespace to match.
   *    @param name - The stanza name to match.
   *    @param type - The stanza type attribute to match.
   *    @param id - The stanza id attribute to match.
   */
  addSysHandlerPromise(
    handler: (element: Element) => Promise<boolean>,
    ns?: string,
    name?: string,
    type?: string,
    id?: string
  ): HandlerAsync {
    const hand = new HandlerAsync(handler, ns, name, type, id, undefined, undefined, false);
    this.addHandlersAsync.push(hand);
    return hand;
  }

  /**
   * Add handlers scheduled for addition
   */
  addScheduledHandlers(): void {
    // add handlers scheduled for addition
    while (this.addHandlers.length > 0) {
      this.handlers.push(this.addHandlers.pop() as Handler);
    }
    while (this.addHandlersAsync.length > 0) {
      this.handlersAsync.push(this.addHandlersAsync.pop() as HandlerAsync);
    }
  }

  /**
   *  add timed handlers scheduled for addition
   *  NOTE: we add before remove in the case a timed handler is
   *  added and then deleted before the next _onIdle() call.
   */
  addTimedHandlersScheduledForAddition(): void {
    while (this.addTimedHandlers.length > 0) {
      this.handlersTimed.push(this.addTimedHandlers.pop() as TimedHandler);
    }
  }

  removeTimedHandlersScheduledForDeletion(): void {
    while (this.removeTimedHandlers.length > 0) {
      const timedHandlers = this.removeTimedHandlers.pop() as TimedHandler;
      const i = this.handlersTimed.indexOf(timedHandlers);
      if (i >= 0) {
        this.handlersTimed.splice(i, 1);
      }
    }
  }

  /**
   *  Call ready timed handlers
   *
   * @param authenticated
   */
  callReadyTimedHandlers(authenticated: boolean): void {
    const now = new Date().getTime();
    const newList = [];
    for (const timedHandler of this.handlersTimed) {
      if (authenticated || !timedHandler.user) {
        const since = timedHandler.lastCalled + timedHandler.period;
        if (since - now <= 0 && timedHandler.run()) {
          newList.push(timedHandler);
        } else {
          newList.push(timedHandler);
        }
      }
    }
    this.handlersTimed = newList;
  }
}
