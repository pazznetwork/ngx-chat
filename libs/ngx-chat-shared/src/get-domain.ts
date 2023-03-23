// SPDX-License-Identifier: AGPL-3.0-or-later
export function getDomain(service: string): string {
  const domain: string = service.split('://')[1] || service;
  const cleanDomain = domain.split(':')[0];
  const domainPart = cleanDomain?.split('/')?.[0];
  if (!domainPart) {
    throw new Error('Could not get domain from service: get-domain.ts');
  }
  return domainPart;
}
