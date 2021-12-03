import { HttpClient } from '@angular/common/http';
import { xml } from '@xmpp/client';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { Service, ServiceDiscoveryPlugin } from './service-discovery.plugin';
import {FileUploadHandler} from '../../../../hooks/file-upload-handler';

/**
 * XEP-0363 http file upload
 */
export class HttpFileUploadPlugin extends AbstractXmppPlugin implements FileUploadHandler {

    private fileUploadSupported: boolean;
    private uploadService: Promise<Service>;

    constructor(
        private readonly httpClient: HttpClient,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly logService: LogService
    ) {
        super();
    }

    onBeforeOnline(): Promise<void> {
        this.uploadService = this.serviceDiscoveryPlugin.findService('store', 'file');
        this.uploadService.then(() => {
            this.fileUploadSupported = true;
        }, () => {
            this.fileUploadSupported = false;
            this.logService.info('http file upload not supported');
        });
        return Promise.resolve();
    }

    onOffline(): void {
        this.uploadService = null;
        this.fileUploadSupported = false;
    }

    async upload(file: File): Promise<string> {
        await this.uploadService;
        const {name, size, type} = file;
        const slotUrl = await this.requestSlot(name, size.toString(), type);
        return await this.uploadToSlot(slotUrl, file);
    }

    isUploadSupported(): boolean {
        return this.fileUploadSupported;
    }

    private async requestSlot(filename: string, size: string, contentType: string): Promise<string | undefined> {
        const to = (await this.uploadService).jid;
        const slotResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {to, type: 'get'},
                xml('request', {xmlns: 'urn:xmpp:http:upload:0', filename, size, 'content-type': contentType})));
        return slotResponse.getChild('slot').getChild('put').attrs.url;
    }

    private async uploadToSlot(slot: string, file: File): Promise<string> {
        await this.httpClient.put(slot, file, {responseType: 'blob'}).toPromise();
        return slot;
    }

}
