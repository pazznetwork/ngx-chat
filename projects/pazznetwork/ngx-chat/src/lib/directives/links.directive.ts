import { ComponentFactoryResolver, Directive, Input, OnChanges, ViewContainerRef } from '@angular/core';
import { ChatMessageLinkComponent } from '../components/chat-message-link/chat-message-link.component';
import { ChatMessageTextComponent } from '../components/chat-message-text/chat-message-text.component';

@Directive({
    selector: '[ngxChatLinks]'
})
export class LinksDirective implements OnChanges {

    @Input('ngxChatLinks') ngxChatLinks: string;

    constructor(private resolver: ComponentFactoryResolver,
                private viewContainerRef: ViewContainerRef) {
    }

    private transform() {
        const message: string = this.ngxChatLinks;

        if (message) {
            const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            const links = this.getAllMatches(urlRegex, message);

            const chatMessageTextFactory = this.resolver.resolveComponentFactory(ChatMessageTextComponent);
            const chatMessageLinkFactory = this.resolver.resolveComponentFactory(ChatMessageLinkComponent);

            let lastIndex = 0;
            for (let i = 0; i < links.length; i++) {
                const currentIndex = message.indexOf(links[i]);

                const textBeforeLink = this.viewContainerRef.createComponent(chatMessageTextFactory);
                textBeforeLink.instance.text = message.substring(lastIndex, currentIndex);

                const linkRef = this.viewContainerRef.createComponent(chatMessageLinkFactory);
                linkRef.instance.link = links[i];
                linkRef.instance.text = this.shorten(links[i]);

                lastIndex = currentIndex + links[i].length;
            }

            const textAfterLastLinkSpan = this.viewContainerRef.createComponent(chatMessageTextFactory);
            textAfterLastLinkSpan.instance.text = message.substring(lastIndex);
        }
    }

    private getAllMatches(urlRegex: RegExp, message: string) {
        const matches: string[] = [];
        let match;
        do {
            match = urlRegex.exec(message);
            if (match) {
                matches.push(match[0]);
            }
        } while (match);
        return matches;
    }

    private shorten(url: string) {
        const parser = document.createElement('a');
        parser.href = url;

        let shortenedPathname = parser.pathname;
        if (shortenedPathname.length > 17) {
            shortenedPathname = shortenedPathname.substring(0, 5) + '...' + shortenedPathname.substring(shortenedPathname.length - 10);
        }

        return parser.protocol + '//' + parser.host + shortenedPathname;
    }

    ngOnChanges(): void {
        this.transform();
    }

}
