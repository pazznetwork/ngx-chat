import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { AttachableTrack } from '../../services/chat-list-state.service';

@Component({
    selector: 'ngx-chat-video-window',
    templateUrl: './chat-video-window.component.html',
    styleUrls: ['./chat-video-window.component.less'],
})
export class ChatVideoWindowComponent implements AfterViewInit {

    @ViewChild('video')
    public video: ElementRef<HTMLVideoElement>;

    @Input()
    track: AttachableTrack;

    constructor() { }

    ngAfterViewInit(): void {
        this.track.attach(this.video.nativeElement);
    }

}
