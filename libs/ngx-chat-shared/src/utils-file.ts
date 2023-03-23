// SPDX-License-Identifier: AGPL-3.0-or-later
export interface SelectFileParameters {
  accept?: string;
  multiple?: boolean;
}

export function selectFile(
  params: SelectFileParameters = { accept: '*', multiple: false }
): Promise<FileList | null> {
  return new Promise((resolve) => {
    const htmlInputElement = document.createElement('input');
    htmlInputElement.style.display = 'none';
    htmlInputElement.type = 'file';
    htmlInputElement.accept = params.accept ?? '';
    htmlInputElement.multiple = params.multiple ?? false;
    htmlInputElement.addEventListener('change', () => {
      resolve(htmlInputElement.files);
      document.body.removeChild(htmlInputElement);
    });
    document.body.appendChild(htmlInputElement);
    htmlInputElement.click();
  });
}
