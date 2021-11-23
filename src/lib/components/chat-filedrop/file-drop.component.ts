import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
    selector: 'ngx-chat-filedrop',
    templateUrl: './file-drop.component.html',
    styleUrls: ['./file-drop.component.less'],
})
export class FileDropComponent {

    @Output()
    readonly fileUpload = new EventEmitter<File>();

    @Input()
    dropMessage: string;

    @Input()
    enabled = true;

    isDropTarget = false;

    @HostListener('dragover', ['$event'])
    @HostListener('dragenter', ['$event'])
    onDragOver(event: any) {
        if (this.enabled) {
            event.preventDefault();
            event.stopPropagation();
            this.isDropTarget = true;
        }
    }

    @HostListener('dragleave', ['$event'])
    @HostListener('dragexit', ['$event'])
    onDragLeave(event: any) {
        event.preventDefault();
        event.stopPropagation();
        this.isDropTarget = false;
    }

    @HostListener('drop', ['$event'])
    async onDrop(event: any) {
        if (this.enabled) {
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

}
