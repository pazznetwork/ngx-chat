import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'ngx-chat-filedrop',
    templateUrl: './file-drop.component.html',
    styleUrls: ['./file-drop.component.less']
})
export class FileDropComponent implements OnInit {

    @Output()
    public fileUpload = new EventEmitter<File>();

    @Input()
    dropMessage: string;

    isDropTarget = false;

    constructor() { }

    ngOnInit() {
    }

    @HostListener('dragover', ['$event'])
    @HostListener('dragenter', ['$event'])
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDropTarget = true;
    }

    @HostListener('dragleave', ['$event'])
    @HostListener('dragexit', ['$event'])
    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDropTarget = false;
    }

    @HostListener('drop', ['$event'])
    async onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();

        this.isDropTarget = false;

        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
            const dataTransferItem = event.dataTransfer.items[i];
            if (dataTransferItem.kind === 'file') {
                this.fileUpload.emit(dataTransferItem.getAsFile());
            }
        }
    }

}
