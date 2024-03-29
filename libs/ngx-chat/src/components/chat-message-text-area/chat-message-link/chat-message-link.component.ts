// SPDX-License-Identifier: AGPL-3.0-or-later
import { PlatformLocation } from '@angular/common';
import { Component, Inject, InjectionToken, Optional, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

export interface LinkOpener {
  openLink(url: string): void;
}

/**
 * You can provide your own implementation for {@link LinkOpener} to override link opening e.g. when using Cordova.
 */
export const LINK_OPENER_TOKEN = new InjectionToken<LinkOpener>('ngxChatLinkOpener');

@Component({
  standalone: true,
  template: `<a
    #anchor
    href="{{ link }}"
    target="_blank"
    rel="noopener"
    (click)="onClick($event)"
    >{{ text }}</a
  >`,
})
export class ChatMessageLinkComponent {
  @ViewChild('anchor')
  anchor?: HTMLAnchorElement;

  link?: string;
  text?: string;

  constructor(
    private router: Router,
    private platformLocation: PlatformLocation,
    @Optional() @Inject(LINK_OPENER_TOKEN) private linkOpener: LinkOpener
  ) {}

  async onClick($event: Event): Promise<void> {
    if (!this.linkOpener && !this.isInApp()) {
      return;
    }

    $event.preventDefault();
    if (this.linkOpener && this.link) {
      this.linkOpener.openLink(this.link);
    } else if (this.isInApp() && this.anchor) {
      await this.router.navigateByUrl(this.anchor.pathname);
    }
  }

  private isInApp(): any {
    return this.link?.startsWith(this.appUrl());
  }

  private appUrl(): string {
    return (
      window.location.protocol +
      '//' +
      window.location.host +
      this.platformLocation.getBaseHrefFromDOM()
    );
  }
}
