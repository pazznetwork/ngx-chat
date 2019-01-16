/**
 * converts date objects to date strings like '2011-10-05'
 */
export function extractDateStringFromDate(date: Date): string {
    const isoString = date.toISOString();
    return isoString.slice(0, isoString.indexOf('T'));
}
