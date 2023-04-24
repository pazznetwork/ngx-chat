// SPDX-License-Identifier: MIT
export interface SaslData {
  keys?: {
    name: string;
    iter: number;
    salt: string;
    ck: string;
    sk: string;
  };
  serverSignature?: string;
  clientFirstMessageBare?: string;
  cnonce?: string;
}
