// SPDX-License-Identifier: MIT
import type { HttpClient } from '@angular/common/http';
import type { XmppService } from '../xmpp.service';
import type { Service, ServiceDiscoveryPlugin } from './service-discovery.plugin';
import type { ChatPlugin } from '../core';
import { Finder } from '../core';
import type { FileUploadHandler } from '@pazznetwork/ngx-chat-shared';
import { firstValueFrom, of } from 'rxjs';

export const upload = 'urn:xmpp:http:upload:0';

/**
 * XEP-0363 http file upload
 */
export class XmppHttpFileUploadHandler implements ChatPlugin, FileUploadHandler {
  readonly nameSpace = upload;

  isUploadSupported$ = of(true);

  constructor(
    private readonly httpClient: HttpClient,
    private readonly xmppChatAdapter: XmppService,
    private readonly uploadService: Promise<Service>
  ) {}

  static getUploadServiceThroughServiceDiscovery(
    serviceDiscoveryPlugin: ServiceDiscoveryPlugin
  ): Promise<Service> {
    return serviceDiscoveryPlugin.findService('store', 'file');
  }

  async upload(file: File): Promise<string> {
    const { name, size, type } = file;
    const slotUrl = await this.requestSlot(name, size.toString(), type);
    if (!slotUrl) {
      throw new Error('Did not receive a slotUrl');
    }
    await firstValueFrom(this.httpClient.put(slotUrl, file, { responseType: 'blob' }));
    return slotUrl;
  }

  private async requestSlot(
    filename: string,
    size: string,
    contentType: string
  ): Promise<string | undefined> {
    const to = (await this.uploadService).jid;
    const slotResponse = await this.xmppChatAdapter.chatConnectionService
      .$iq({ to, type: 'get' })
      .c('request', { xmlns: this.nameSpace, filename, size, 'content-type': contentType })
      .send();
    return (
      Finder.create(slotResponse)
        ?.searchByTag('slot')
        ?.searchByTag('put')
        ?.result?.getAttribute('url') ?? undefined
    );
  }
}
