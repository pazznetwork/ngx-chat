// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { FileUploadHandler } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle file uploads in the chat.
 */
export const FILE_UPLOAD_HANDLER_TOKEN = new InjectionToken<FileUploadHandler>(
  'ngxChatFileUploadHandler'
);
