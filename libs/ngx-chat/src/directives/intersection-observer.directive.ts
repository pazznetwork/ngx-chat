// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  standalone: true,
  selector: '[ngxChatIntersectionObserver]',
})
export class IntersectionObserverDirective implements OnDestroy, OnInit {
  private readonly el = inject<ElementRef<Element>>(ElementRef);
  private readonly isPlatformBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true })
  rootElement!: HTMLElement;

  @Output()
  ngxChatIntersectionObserver = new EventEmitter<void>();

  private intersectionObserver?: IntersectionObserver;

  ngOnInit(): void {
    if (this.isPlatformBrowser) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              (entry.isIntersecting && this.el.nativeElement.nextElementSibling?.clientHeight) ??
              0 > 0
            ) {
              this.ngxChatIntersectionObserver.emit();
            }
          });
        },
        {
          root: this.rootElement,
        }
      );
      this.intersectionObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }
}
