// SPDX-License-Identifier: AGPL-3.0-or-later
import { Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[ngxChatIntersectionObserver]',
})
export class IntersectionObserverDirective implements OnDestroy {
  @Output()
  ngxChatIntersectionObserver = new EventEmitter();

  private intersectionObserver: IntersectionObserver;

  constructor(el: ElementRef<Element>) {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.ngxChatIntersectionObserver.emit(entries[0]);
      },
      {
        // even if user is not pixel-perfect at the bottom of a chat message list we still want to
        // react to new messages, hence we have a buffer of 150px around the bottom of the chat message list
        rootMargin: '150px 0px 150px 0px',
      }
    );
    this.intersectionObserver.observe(el.nativeElement);
  }

  ngOnDestroy(): void {
    this.intersectionObserver.disconnect();
  }
}
