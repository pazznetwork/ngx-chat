import { Element } from 'ltx';

export interface Stanza extends Element {
    attrs: {
        [key: string]: string;
    };
    children: Stanza[];
    name: string;

    getChildText(child: string): string;

    getChild(child: string): Stanza;

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
