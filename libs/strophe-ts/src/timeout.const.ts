// SPDX-License-Identifier: MIT
/** PrivateConstants: Timeout Values
 *  Timeout values for error states.  These values are in seconds.
 *  These should not be changed unless you know exactly what you are
 *  doing.
 *
 *  TIMEOUT - Timeout multiplier. A waiting request will be considered
 *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
 *      This defaults to 1.1, and with default wait, 66 seconds.
 *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
 *      Strophe can detect early failure, it will consider the request
 *      failed if it doesn't return after
 *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
 *      This defaults to 0.1, and with default wait, 6 seconds.
 */
export const TIMEOUT = 1.1;
export const SECONDARY_TIMEOUT = 0.1;
