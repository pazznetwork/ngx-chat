// SPDX-License-Identifier: MIT
import { $build, $pres } from './builder-helper';
import { NS } from './namespace';

export const presenceUnavailable = $pres({
  xmlns: NS.CLIENT,
  type: 'unavailable',
}).tree();

export const streamClose = $build('close', { xmlns: NS.FRAMING }).tree();

/**
 *  Generates the <open> start tag for WebSocket stream
 *
 *  @returns A <open> element.
 */
export function buildOpenStanza(to: string): Element {
  return $build('open', { xmlns: NS.FRAMING, to, version: '1.0' }).tree();
}
