// SPDX-License-Identifier: MIT
/**
 *  helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistent depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */
import { getBareJidFromJid, stanzaMatch } from './stanza';
import { handleError, StropheError } from './error';

export class Handler {
  /**
   * Create and initialize a new Strophe.Handler
   *
   * Parameters:
   *
   * @param handler handler function to run if the configured attributes for it match against the stanza
   * @param ns namespace to match the incoming stanza against to find the right handler
   * @param name tagName to match the incoming stanza against to find the right handler
   * @param type type to match the incoming stanza against to find the right handler
   * @param id id to match the incoming stanza against to find the right handler
   * @param from from jid to match the incoming stanza against to find the right handler
   * @param options matchBareFromJid match only the local and domain of the jid, ignoreNamespaceFragment ignores '#' in namespace
   * @param user whether the handler is a user handler or a system handler
   */
  constructor(
    readonly handler: (stanza: Element) => boolean | Promise<boolean>,
    readonly ns?: string,
    readonly name?: string,
    readonly type?: string | string[],
    readonly id?: string,
    readonly from?: string,
    readonly options = { matchBareFromJid: false, ignoreNamespaceFragment: false },
    readonly user = true
  ) {
    this.from = options.matchBareFromJid && from ? getBareJidFromJid(from) ?? undefined : from;
  }

  /**
   *  Tests if a stanza matches the Strophe.Handler.
   *
   *  Parameters:
   *
   *    @param elem - The XML element to test.
   *
   *  Returns:
   *    @returns true if the stanza matches and false otherwise.
   */
  isMatch(elem: Element): boolean {
    return stanzaMatch(
      elem,
      {
        ns: this.ns,
        name: this.name,
        type: this.type,
        id: this.id,
        from: this.from,
      },
      this.options
    );
  }

  /**
   *  Run the callback on a matching stanza.
   *
   *  Parameters:
   *
   *    @param elem - The DOM element that triggered the
   *      Strophe.Handler.
   *
   *  Returns:
   *    @returns A boolean indicating if the handler should remain active.
   */
  run(elem: Element): boolean | Promise<boolean> {
    let result = null;
    try {
      result = this.handler(elem);
    } catch (e) {
      handleError(e as StropheError);
      throw e;
    }
    return result;
  }

  /**
   *  Get a String representation of the Strophe.Handler object.
   *
   *  Returns:
   *
   *   @returns A String.
   */
  toString(): string {
    return `{Handler: ${String(this.handler)}(${String(this.name)},${String(this.id)},${String(
      this.ns
    )})}`;
  }
}
