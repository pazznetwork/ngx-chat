// SPDX-License-Identifier: AGPL-3.0-or-later
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWindowFrameComponent } from '../chat-window-frame';
import { AttachableTrack } from '@pazznetwork/ngx-chat-shared';

@Component({
    imports: [CommonModule, ChatWindowFrameComponent],
    selector: 'ngx-chat-video-window',
    templateUrl: './chat-video-window.component.html',
    styleUrls: ['./chat-video-window.component.less']
})
export class ChatVideoWindowComponent implements AfterViewInit {
  @ViewChild('video')
  video!: ElementRef<HTMLVideoElement>;

  @Input()
  track?: AttachableTrack;

  constructor() {}

  ngAfterViewInit(): void {
    this.track?.attach(this.video.nativeElement);
  }
}
