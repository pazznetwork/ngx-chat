import { Element } from 'ltx';

export type Stanza = Element;

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
