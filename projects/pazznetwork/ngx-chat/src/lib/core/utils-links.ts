export const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

export function extractUrls(message: string): RegExpMatchArray {
    return message.match(urlRegex) || [];
}
