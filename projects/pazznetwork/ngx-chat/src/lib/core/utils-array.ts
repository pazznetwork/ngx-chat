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
 * Find the highest possible index where the given element should be inserted so that the order of the list is preserved.
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

/**
 * Find the index of an element in a sorted list. If list contains no matching element, return -1.
 */
export function findSortedIndex<U, V>(needle: U, haystack: V[], keyExtractor: (a: V) => any = toString) {
    let low = 0;
    let high = haystack.length;

    while (low !== high) {

        const cur = Math.floor(low + (high - low) / 2);

        const extractedKey = keyExtractor(haystack[cur]);
        if (needle < extractedKey) {
            high = cur;
        } else if (needle > extractedKey) {
            low = cur + 1;
        } else {
            return cur;
        }

    }

    return -1;
}

/**
 * Like {@link Array.prototype.findIndex} but finds the last index instead.
 */
export function findLastIndex<T>(arr: T[], predicate: (x: T) => boolean) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) {
            return i;
        }
    }
    return -1;
}

/**
 * Like {@link Array.prototype.find} but finds the last matching element instead.
 */
export function findLast<T>(arr: T[], predicate: (x: T) => boolean) {
    return arr[findLastIndex(arr, predicate)];
}

/**
 * Return a new array, where all elements from the original array occur exactly once.
 */
export function removeDuplicates<T>(arr: T[], eq: (x: T, y: T) => boolean = (x: T, y: T) => x === y): T[] {
    const results = [];
    for (const arrElement of arr) {
        let duplicateFound = false;
        for (const resultElement of results) {
            if (eq(arrElement, resultElement)) {
                duplicateFound = true;
                break;
            }
        }
        if (!duplicateFound) {
            results.push(arrElement);
        }
    }
    return results;
}
