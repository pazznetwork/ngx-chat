// SPDX-License-Identifier: MIT
import { Handler } from './handler';
import { isDeprecatedStanza } from './stanza';

export class HandlerService {
  // handler lists
  handlers: Handler[] = [];
  removeHandlers: Handler[] = [];
  addHandlers: Handler[] = [];

  constructor(private readonly iqFallbackHandler: Handler) {}

  resetHandlers(): void {
    this.handlers = [];
    this.removeHandlers = [];
    this.addHandlers = [];
  }

  async checkHandlerChain(child: Element): Promise<void> {
    // check against deprecated XEP stanzas
    if (isDeprecatedStanza(child)) {
      return;
    }

    const keptHandlers = [];
    let matches = 0;

    const potentialHandlers = [];

    for (const handler of this.handlers) {
      if (!handler.isMatch(child)) {
        keptHandlers.push(handler);
      } else {
        potentialHandlers.push(handler);
      }
    }

    // prioritize id handler before any other handler
    // as this is my intuitively expected behaviour
    // and would need otherwise ugly workarounds
    const idHandler = potentialHandlers.find((handler) => !!handler.id);

    const executeHandler = async (handler: Handler): Promise<void> => {
      try {
        if (await handler.run(child)) {
          keptHandlers.push(handler);
        }
        matches++;
      } catch (e) {
        // if the handler throws an exception, we consider it as false
        throw new Error(
          'Removing Strophe handler ' +
            handler.toString() +
            ' due to uncaught exception: ' +
            (e as Error).message
        );
      }
    };

    if (idHandler) {
      await executeHandler(idHandler);
      return;
    }

    for (const handler of potentialHandlers) {
      await executeHandler(handler);
    }

    // If no handler was fired for an incoming IQ with type="set",
    // then we return an IQ error stanza with service-unavailable.
    if (matches === 0 && this.iqFallbackHandler.isMatch(child)) {
      await this.iqFallbackHandler.run(child);
    }
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
    if (i === -1) {
      return;
    }
    this.addHandlers.splice(i, 1);
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
    handler: (stanza: Element) => Promise<boolean> | boolean,
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

  removeScheduledHandlers(): void {
    // remove handlers scheduled for deletion
    while (this.removeHandlers.length > 0) {
      const hand = this.removeHandlers.pop();
      const i = this.handlers.indexOf(hand as Handler);
      if (i === -1) {
        return;
      }
      this.handlers.splice(i, 1);
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
    handler: (element: Element) => boolean | Promise<boolean>,
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
   * Add handlers scheduled for addition
   */
  addScheduledHandlers(): void {
    // add handlers scheduled for addition
    while (this.addHandlers.length > 0) {
      this.handlers.push(this.addHandlers.pop() as Handler);
    }
  }
}
