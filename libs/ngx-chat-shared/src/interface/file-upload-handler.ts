// SPDX-License-Identifier: AGPL-3.0-or-later
import { Observable } from 'rxjs';

export interface FileUploadHandler {
  isUploadSupported$: Observable<boolean>;

  /**
   * @return {string} Returns the public URL of the uploaded file.
   */
  upload(file: File): Promise<string>;
}
