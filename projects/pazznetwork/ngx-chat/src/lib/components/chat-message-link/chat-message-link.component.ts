import { PlatformLocation } from '@angular/common';
import { Component, Inject, InjectionToken, Optional } from '@angular/core';
import { Router } from '@angular/router';

export interface LinkOpener {
    openLink(url: string): void;
}

/**
 * You can provide your own implementation for {@link LinkOpener} to override link opening e.g. when using Cordova.
 */
export const LINK_OPENER_TOKEN = new InjectionToken<LinkOpener>('ngxChatLinkOpener');

@Component({
    selector: 'ngx-chat-message-link',
    templateUrl: './chat-message-link.component.html',
    styleUrls: ['./chat-message-link.component.less']
})
export class ChatMessageLinkComponent {

    link: string;
    text: string;

    constructor(private router: Router,
                private platformLocation: PlatformLocation,
                @Optional() @Inject(LINK_OPENER_TOKEN) private linkOpener: LinkOpener) { }

    onClick($event: Event) {
        if (this.linkOpener) {
            $event.preventDefault();
            this.linkOpener.openLink(this.link);
        } else if (this.isInApp()) {
            $event.preventDefault();
            const linkParser = document.createElement('a');
            linkParser.href = this.link;
            this.router.navigateByUrl(linkParser.pathname);
        }
    }

    private isInApp() {
        return this.link.startsWith(this.appUrl());
    }

    private appUrl() {
        return window.location.protocol + '//' + window.location.host + this.platformLocation.getBaseHrefFromDOM();
    }
}
