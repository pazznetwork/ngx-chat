// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  standalone: true,
  selector: '[ngxChatResizeObserver]',
})
export class ResizeObserverDirective implements OnDestroy, OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isPlatformBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @Output('ngxChatResizeObserver')
  resized = new EventEmitter<void>();

  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    if (this.isPlatformBrowser) {
      this.resizeObserver = new ResizeObserver(() => this.resized.emit());

      this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
