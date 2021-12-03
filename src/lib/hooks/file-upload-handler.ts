import {InjectionToken} from '@angular/core';

/**
 * Optional injectable token to handle file uploads in the chat.
 */
export const FILE_UPLOAD_HANDLER_TOKEN = new InjectionToken<FileUploadHandler>('ngxChatFileUploadHandler');

export interface FileUploadHandler {
    /**
     * @return {string} Returns the public URL of the uploaded file.
     */
    upload(file: File): Promise<string>;

}
