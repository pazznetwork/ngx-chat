// SPDX-License-Identifier: MIT
import { $build, $pres } from './builder-helper';
import { NS } from './namespace';

export const presenceUnavailable = (): Element =>
  $pres({
    xmlns: NS.CLIENT,
    type: 'unavailable',
  }).tree();

export const streamClose = (): Element => $build('close', { xmlns: NS.FRAMING }).tree();

/**
 *  Generates the <open> start tag for WebSocket stream
 *
 *  @returns A <open> element.
 */
export function buildOpenStanza(to: string): Element {
  return $build('open', { xmlns: NS.FRAMING, to, version: '1.0' }).tree();
}

/**
 * new DOMParser().parseFromString(html, 'text/xml').documentElement.matches('iq[xmlns="jabber:client"]:has(query[xmlns="jabber:iq:privacy"])')
 *
 * @param {Element} stanza
 * @returns {boolean}
 */
export function isDeprecatedStanza(stanza: Element): boolean {
  return stanza.querySelector('iq > query')?.getAttribute('xmlns') === NS.PRIVACY;
}
