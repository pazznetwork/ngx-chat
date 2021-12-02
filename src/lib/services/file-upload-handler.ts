import {InjectionToken} from '@angular/core';

/**
 * Optional injectable token to handle file uploads in the chat.
 */
export const FILE_UPLOAD_HANDLER_TOKEN = new InjectionToken<FileUploadHandler>('ngxChatFileUploadHandler');

export interface FileUploadHandler {
    /**
     * @param {File} file The file to upload.
     * @return {string} Returns the public URL of the file.
     */
    upload(file: File): string;

}
