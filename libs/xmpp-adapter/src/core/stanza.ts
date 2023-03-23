// SPDX-License-Identifier: MIT
export type Stanza = Element;

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IqResponseStanza<ResponseType extends 'result' | 'error' = 'result' | 'error'> = Stanza;

export type PresenceStanza = Stanza;

export type MessageWithBodyStanza = Stanza;
