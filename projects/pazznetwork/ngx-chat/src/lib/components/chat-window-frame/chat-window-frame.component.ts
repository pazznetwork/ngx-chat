import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'ngx-chat-window-frame',
    templateUrl: './chat-window-frame.component.html',
    styleUrls: ['./chat-window-frame.component.less'],
})
export class ChatWindowFrameComponent implements OnInit {

    @Output()
    fileDrop = new EventEmitter<File>();

    @Input()
    fileDropEnabled = false;

    @Input()
    fileDropMessageKey = '';

    @Input()
    windowIcon = '';

    @Input()
    windowTitle = '';

    @Output()
    closeClick = new EventEmitter<void>();

    @Output()
    headerClick = new EventEmitter<void>();

    constructor() { }

    ngOnInit(): void {
    }

}
