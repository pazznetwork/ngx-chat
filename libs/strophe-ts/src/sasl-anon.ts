// SPDX-License-Identifier: MIT
import type { Sasl } from './sasl';
import { SASLMechanismBase } from './sasl-mechanism-base';

export class SASLAnonymous extends SASLMechanismBase {
  /**
   *  SASL ANONYMOUS authentication.
   */
  constructor() {
    super('ANONYMOUS', false, 20);
  }

  onChallenge(_sasl: Sasl): Promise<string> {
    return Promise.resolve('');
  }

  test(sasl: Sasl): boolean {
    return sasl.authcid === null;
  }
}
