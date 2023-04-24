// SPDX-License-Identifier: MIT
/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
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
import { forEachChildMap, getBareJidFromJid, isTagEqual } from './xml';

export interface MatcherConfig {
  /**
   * matchBareFromJid match only the local and domain of the jid
   */
  matchBareFromJid?: boolean;
  /**
   * ignoreNamespaceFragment ignores '#' in namespace
   */
  ignoreNamespaceFragment?: boolean;
  /**
   * namespace to match the incoming stanza against to find the right handler
   */
  ns?: string;
  /**
   *  tagName to match the incoming stanza against to find the right handler
   */
  tagName?: string;
  /**
   * type to match the incoming stanza against to find the right handler
   */
  type?: string | string[];
  /**
   * id to match the incoming stanza against to find the right handler
   */
  id?: string;
  /**
   * from jid to match the incoming stanza against to find the right handler
   */
  from?: string;

  /**
   * namespace not to match against, muc vs default messaging
   */
  noNS?: string;
}

export class Matcher {
  private readonly config: MatcherConfig;
  user: boolean;

  /**
   * PrivateConstructor: Strophe.Handler
   *  Create and initialize a new Strophe.Handler
   *
   * Parameters:
   *
   * @param config how to match against stanzas
   */
  constructor(config?: MatcherConfig) {
    this.config = { matchBareFromJid: false, ignoreNamespaceFragment: false, ...config };
    const { from } = this.config;
    if (from && this.config.matchBareFromJid) {
      this.config.from = from ? getBareJidFromJid(from) ?? undefined : undefined;
    } else {
      this.config.from = from;
    }
    // whether the handler is a user handler or a system handler
    this.user = true;
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
  private getNamespace(elem: Element): string {
    const elNamespace = elem.getAttribute('xmlns');
    if (elNamespace && this.config.ignoreNamespaceFragment) {
      return elNamespace.split('#')[0] as string;
    }
    return elNamespace ?? '';
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
  private namespaceMatch(elem: Element, ns: string | undefined, noNS: string | undefined): boolean {
    let nsMatch = false;
    if (!ns && !noNS) {
      return true;
    }

    forEachChildMap(elem, null, (el) => {
      const elNS = this.getNamespace(el);
      if ((ns && elNS === ns) || (noNS && elNS !== noNS)) {
        nsMatch = true;
      }
    });
    const elemNS = this.getNamespace(elem);
    return nsMatch || (ns != null && elemNS === ns) || (noNS != null && elemNS !== noNS);
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
    const { matchBareFromJid, tagName, type, id, from, ns, noNS } = this.config;

    const elemFrom = elem.getAttribute('from');
    const sanitizedFrom = elemFrom && matchBareFromJid ? getBareJidFromJid(elemFrom) : elemFrom;
    const elemType = elem.getAttribute('type');
    const elemId = elem.getAttribute('id');

    const nsMatch = this.namespaceMatch(elem, ns, noNS);
    const tagNameMatch = !tagName || isTagEqual(elem, tagName);
    const typeMatch = this.typeMatch(type, elemType);
    const idMatch = !id || elemId === id;
    const fromMatch = !from || sanitizedFrom === from;

    return nsMatch && tagNameMatch && typeMatch && idMatch && fromMatch;
  }

  /**
   *  Get a String representation of the Strophe.Handler object.
   *
   *  Returns:
   *
   *   @returns A String.
   */
  toString(): string {
    return `{Matcher: (${JSON.stringify(this.config)})}`;
  }

  private typeMatch(type: string | string[] | undefined, elemType: string | null): boolean {
    if (!type) {
      return true;
    }

    if (type && !elemType) {
      return false;
    }

    if (Array.isArray(type)) {
      return type.includes(elemType as string);
    }

    return elemType === type;
  }
}
