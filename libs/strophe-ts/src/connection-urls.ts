// SPDX-License-Identifier: MIT
function onDomainDiscovered(xmlBody: string): { websocketUrl: string; boshServiceUrl: string } {
  const discoNS = 'http://docs.oasis-open.org/ns/xri/xrd-1.0';
  const xrd = new window.DOMParser().parseFromString(xmlBody, 'text/xml').firstElementChild;

  if (!xrd || xrd.nodeName !== 'XRD' || xrd.getAttribute('xmlns') !== discoNS) {
    throw new Error('Could not discover XEP-0156 connection methods');
  }

  const boshServiceUrl = xrd
    .querySelector(`Link[rel="urn:xmpp:alt-connections:xbosh"]`)
    ?.getAttribute('href') as string;
  const websocketUrl = xrd
    .querySelector(`Link[rel="urn:xmpp:alt-connections:websocket"]`)
    ?.getAttribute('href') as string;

  if (boshServiceUrl == null && websocketUrl == null) {
    throw new Error(
      'Neither BOSH nor WebSocket connection methods have been specified with XEP-0156.'
    );
  }
  return { websocketUrl, boshServiceUrl };
}

/**
 * Adds support for XEP-0156 by querying the XMPP server for alternate
 * connection methods. This allows users to use the websocket or BOSH
 * connection of their own XMPP server
 *
 * @param domain the xmpp server domain to requests the connection urls from
 */
async function discoverConnectionMethods(
  domain: string
): Promise<{ websocketUrl: string; boshServiceUrl: string }> {
  const url = `https://${domain}/.well-known/host-meta`;

  // Use XEP-0156 to check whether this host advertises websocket or BOSH connection methods.
  const text = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/xrd+xml, text/xml');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.responseText);
      } else {
        reject(
          new Error(
            `Failed to discover alternative connection methods at ${url}; ${xhr.status}: ${xhr.responseText}`
          )
        );
      }
    };
    xhr.onerror = reject;
    xhr.send();
  });

  return onDomainDiscovered(text);
}

export async function getConnectionsUrls(
  domain: string,
  service?: string
): Promise<{ websocketUrl?: string; boshServiceUrl?: string }> {
  const isWebsocket = service ? /wss?:\/\//.test(service) : false;
  const boshServiceUrl = isWebsocket ? undefined : service;
  const websocketUrl = isWebsocket ? service : undefined;

  if (boshServiceUrl || websocketUrl) {
    return { boshServiceUrl, websocketUrl };
  }
  return discoverConnectionMethods(domain);
}
