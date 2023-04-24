// SPDX-License-Identifier: MIT
/** Function: $build
 *  Create a Strophe.Builder.
 *  This is an alias for 'new Strophe.Builder(name, attrs)'.
 *
 *  Parameters:
 *
 *    @param name - The root element name.
 *    @param attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    @returns A new Strophe.Builder object.
 */
import { Builder } from './builder';

export function $build(name: string, attrs?: Record<string, string>): Builder {
  return new Builder(name, attrs);
}

/** Function: $msg
 *  Create a Strophe.Builder with a <message/> element as the root.
 *
 *  Parameters:
 *
 *    @param attrs - The <message/> element attributes in object notation.
 *
 *  Returns:
 *    @returns A new Strophe.Builder object.
 */
export function $msg(attrs?: Record<string, string>): Builder {
  return $build('message', attrs);
}

/** Function: $iq
 *  Create a Strophe.Builder with an <iq/> element as the root.
 *
 *  Parameters:
 *
 *    @param attrs - The <iq/> element attributes in object notation.
 *
 *  Returns:
 *    @returns A new Strophe.Builder object.
 */
export function $iq(attrs?: Record<string, string>): Builder {
  return $build('iq', attrs);
}

/** Function: $pres
 *  Create a Strophe.Builder with a <presence/> element as the root.
 *
 *  Parameters:
 *
 *    @param attrs - The <presence/> element attributes in object notation.
 *
 *  Returns:
 *    @returns A new Strophe.Builder object.
 */
export function $pres(attrs?: Record<string, string>): Builder {
  return $build('presence', attrs);
}
