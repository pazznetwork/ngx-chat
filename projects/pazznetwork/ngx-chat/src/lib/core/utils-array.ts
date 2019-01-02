export const identity: <T>(elem: T) => T = elem => elem;
export const toString: (elem: any) => string = elem => elem.toString();

/**
 * given a sorted list, insert the given item in place after the last matching item.
 * @param elemToInsert the item to insert
 * @param list the list in which the element should be inserted
 * @param keyExtractor an optional element mapper, defaults to toString
 */
export function insertSortedLast<U>(elemToInsert: U, list: U[], keyExtractor: (a: U) => any = toString) {
    list.splice(findSortedInsertionIndexLast(keyExtractor(elemToInsert), list, keyExtractor), 0, elemToInsert);
}

/**
 * Find the last matching element in a presorted list.
 * @param needle the needle to find
 * @param haystack the pre sorted list
 * @param keyExtractor an optional needle mapper, defaults to toString
 */
export function findSortedInsertionIndexLast<U, V>(needle: U, haystack: V[], keyExtractor: (a: V) => any = toString) {
    let low = 0;
    let high = haystack.length;

    while (low !== high) {

        const cur = Math.floor(low + (high - low) / 2);

        if (needle < keyExtractor(haystack[cur])) {
            high = cur;
        } else {
            low = cur + 1;
        }

    }

    return low;
}
