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
import { forEachChildMap, getBareJidFromJid, isTagEqual } from './stanza/xml';
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
    private readonly handler: (stanza: Element) => boolean,
    private readonly ns?: string,
    private readonly name?: string,
    private readonly type?: string | string[],
    private readonly id?: string,
    private readonly from?: string,
    readonly options = { matchBareFromJid: false, ignoreNamespaceFragment: false },
    readonly user = true
  ) {
    this.from = options.matchBareFromJid && from ? getBareJidFromJid(from) ?? undefined : from;
  }

  /** PrivateFunction: getNamespace
   *  Returns the XML namespace attribute on an element.
   *  If `ignoreNamespaceFragment` was passed in for this handler, then the
   *  URL fragment will be stripped.
   *
   *  Parameters:
   *    (XMLElement) elem - The XML element with the namespace.
   *
   *  Returns:
   *    The namespace, with optionally the fragment stripped.
   */
  private getNamespace(elem: Element): string | null {
    const elNamespace = elem.getAttribute('xmlns');

    if (!elNamespace) {
      return elNamespace;
    }

    if (elNamespace && !this.options.ignoreNamespaceFragment) {
      return elNamespace;
    }

    return elNamespace.split('#')[0] ?? null;
  }

  /** PrivateFunction: namespaceMatch
   *  Tests if a stanza matches the namespace set for this Strophe.Handler.
   *
   *  Parameters:
   *    (XMLElement) elem - The XML element to test.
   *
   *  Returns:
   *    true if the stanza matches and false otherwise.
   */
  private namespaceMatch(elem: Element): boolean {
    let nsMatch = false;
    if (!this.ns) {
      return true;
    } else {
      forEachChildMap(elem, null, (el) => {
        if (this.getNamespace(el) === this.ns) {
          nsMatch = true;
        }
      });
      return nsMatch || this.getNamespace(elem) === this.ns;
    }
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
    let from = elem.getAttribute('from');
    if (this.options.matchBareFromJid && from) {
      from = getBareJidFromJid(from);
    }
    const elem_type = elem.getAttribute('type');
    let result =
      this.namespaceMatch(elem) &&
      (!this.name || isTagEqual(elem, this.name)) &&
      (!this.id || elem.getAttribute('id') === this.id) &&
      (!this.from || from === this.from);

    if (Array.isArray(this.type) && elem_type) {
      result = result && (!this.type || this.type.indexOf(elem_type) !== -1);
    } else {
      result = result && (!this.type || elem_type === this.type);
    }
    return result;
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
  run(elem: Element): boolean {
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
