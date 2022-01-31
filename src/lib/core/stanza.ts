import { Element } from 'ltx';

export interface Stanza extends Element {
    attrs: {
        [key: string]: string | undefined;
    };
    children: Stanza[];
    name: string;
}

export interface IqResponseStanza<ResponseType extends 'result' | 'error' = 'result' | 'error'> extends Stanza {
    attrs: {
        id: string;
        type: ResponseType;
        from?: string;
        to?: string;
    };
}

export interface PresenceStanza extends Stanza {
    attrs: {
        from?: string;
        to?: string;
        type?: string;
    };
}

export interface MessageWithBodyStanza extends Stanza {
    attrs: {
        to?: string;
        from?: string;
        type?: string;
        id?: string;
    };
}
