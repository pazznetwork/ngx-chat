import { ComponentFactoryResolver, Directive, Input, OnChanges, ViewContainerRef } from '@angular/core';
import { ChatMessageLinkComponent } from '../components/chat-message-link/chat-message-link.component';
import { ChatMessageTextComponent } from '../components/chat-message-text/chat-message-text.component';
import { extractUrls } from '../core/utils-links';

@Directive({
    selector: '[ngxChatLinks]'
})
export class LinksDirective implements OnChanges {

    @Input() ngxChatLinks: string;

    constructor(private readonly resolver: ComponentFactoryResolver,
                private readonly viewContainerRef: ViewContainerRef) {
    }

    ngOnChanges(): void {
        this.transform();
    }

    private transform(): void {
        const message = this.ngxChatLinks;

        if (!message) {
            return;
        }

        const links = extractUrls(message);

        const chatMessageTextFactory = this.resolver.resolveComponentFactory(ChatMessageTextComponent);
        const chatMessageLinkFactory = this.resolver.resolveComponentFactory(ChatMessageLinkComponent);

        let lastIndex = 0;
        for (const link of links) {
            const currentIndex = message.indexOf(link, lastIndex);

            const textBeforeLink = message.substring(lastIndex, currentIndex);
            if (textBeforeLink) {
                const textBeforeLinkComponent = this.viewContainerRef.createComponent(chatMessageTextFactory);
                textBeforeLinkComponent.instance.text = textBeforeLink;
            }

            const linkRef = this.viewContainerRef.createComponent(chatMessageLinkFactory);
            linkRef.instance.link = link;
            linkRef.instance.text = this.shorten(link);

            lastIndex = currentIndex + link.length;
        }

        const textAfterLastLink = message.substring(lastIndex);
        if (textAfterLastLink) {
            const textAfterLastLinkComponent = this.viewContainerRef.createComponent(chatMessageTextFactory);
            textAfterLastLinkComponent.instance.text = textAfterLastLink;
        }
    }

    private shorten(url: string): string {
        const parser = document.createElement('a');
        parser.href = url;

        let shortenedPathname = parser.pathname;
        if (shortenedPathname.length > 17) {
            shortenedPathname = shortenedPathname.substring(0, 5) + '...' + shortenedPathname.substring(shortenedPathname.length - 10);
        }

        return parser.protocol + '//' + parser.host + shortenedPathname;
    }

}
