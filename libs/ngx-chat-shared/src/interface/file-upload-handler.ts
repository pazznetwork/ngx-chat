// SPDX-License-Identifier: AGPL-3.0-or-later
export interface FileUploadHandler {
  /**
   * @return {string} Returns the public URL of the uploaded file.
   */
  upload(file: File): Promise<string>;

  isUploadSupported(): boolean;
}
