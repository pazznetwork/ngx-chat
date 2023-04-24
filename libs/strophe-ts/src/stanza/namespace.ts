// SPDX-License-Identifier: MIT
/** Constants: XMPP Namespace Constants
 *  Common namespace constants from the XMPP RFCs and XEPs.
 *
 *  NS.HTTPBIND - HTTP BIND namespace from XEP 124.
 *  NS.BOSH - BOSH namespace from XEP 206.
 *  NS.CLIENT - Main XMPP client namespace.
 *  NS.AUTH - Legacy authentication namespace.
 *  NS.ROSTER - Roster operations namespace.
 *  NS.PROFILE - Profile namespace.
 *  NS.DISCO_INFO - Service discovery info namespace from XEP 30.
 *  NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
 *  NS.MUC - Multi-User Chat namespace from XEP 45.
 *  NS.SASL - XMPP SASL namespace from RFC 3920.
 *  NS.STREAM - XMPP Streams namespace from RFC 3920.
 *  NS.BIND - XMPP Binding namespace from RFC 3920 and RFC 6120.
 *  NS.SESSION - XMPP Session namespace from RFC 3920.
 *  NS.XHTML_IM - XHTML-IM namespace from XEP 71.
 *  NS.XHTML - XHTML body namespace from XEP 71.
 */
export enum NS {
  HTTPBIND = 'http://jabber.org/protocol/httpbind',
  BOSH = 'urn:xmpp:xbosh',
  CLIENT = 'jabber:client',
  AUTH = 'jabber:iq:auth',
  ROSTER = 'jabber:iq:roster',
  PROFILE = 'jabber:iq:profile',
  DISCO_INFO = 'http://jabber.org/protocol/disco#info',
  DISCO_ITEMS = 'http://jabber.org/protocol/disco#items',
  MUC = 'http://jabber.org/protocol/muc',
  SASL = 'urn:ietf:params:xml:ns:xmpp-sasl',
  STREAM = 'http://etherx.jabber.org/streams',
  FRAMING = 'urn:ietf:params:xml:ns:xmpp-framing',
  BIND = 'urn:ietf:params:xml:ns:xmpp-bind',
  SESSION = 'urn:ietf:params:xml:ns:xmpp-session',
  VERSION = 'jabber:iq:version',
  STANZAS = 'urn:ietf:params:xml:ns:xmpp-stanzas',
  XHTML_IM = 'http://jabber.org/protocol/xhtml-im',
  XHTML = 'http://www.w3.org/1999/xhtml',
  PRIVACY = 'jabber:iq:privacy',
}

/** Function: addNamespace
 *  This function is used to extend the current namespaces in
 *  Strophe.NS.  It takes a key and a value with the key being the
 *  name of the new namespace, with its actual value.
 *  For example:
 *  Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
 *
 *  Parameters:
 *
 *    @param name - The name under which the namespace will be
 *      referenced under Strophe.NS
 *    @param value - The actual namespace.
 */
export function addNamespace(name: string, value: string): void {
  NS[name] = value;
}
