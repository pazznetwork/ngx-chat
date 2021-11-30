export function getDomain(service: string) {
    const domain = service.split('://')[1] || service;
    return domain.split(':')[0].split('/')[0];
}
