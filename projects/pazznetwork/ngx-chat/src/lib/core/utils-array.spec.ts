import { findSortedIndex, findSortedInsertionIndexLast, insertSortedLast } from './utils-array';

describe('array utils', () => {

    describe('#findSortedInsertionIndexLast', () => {

        it('should find correct index if multiple same items occur', () => {
            const list = [1, 5, 5, 5, 5, 5, 5, 9];
            expect(findSortedInsertionIndexLast(1, list)).toEqual(1);
            expect(findSortedInsertionIndexLast(5, list)).toEqual(7);
            expect(findSortedInsertionIndexLast(9, list)).toEqual(8);
        });

        it('should return if element does not exist', () => {
            expect(findSortedInsertionIndexLast(5, [])).toEqual(0);
            expect(findSortedInsertionIndexLast(5, [1])).toEqual(1);
        });

    });

    describe('#insertSortedLast', () => {

        it('should insert elements and sort the list correctly', () => {
            const list = [];
            const numbers = [5, 1, 7, 9, 123, -23, -24, 0, 0, 0];
            for (const number of numbers) {
                insertSortedLast(number, list);
                const sortedCopy = [].concat(list).sort();
                expect(list).toEqual(sortedCopy);
            }
        });

    });

    describe('#findSortedIndex', () => {
        it('should find the correct index of an element in a sorted list', () => {
            expect(findSortedIndex(-50, [-50, 2, 100])).toEqual(0);
            expect(findSortedIndex(2, [-50, 2, 100])).toEqual(1);
            expect(findSortedIndex(100, [-50, 2, 100])).toEqual(2);
            expect(findSortedIndex(42, [-50, 2, 100])).toEqual(-1);
        });
    });

});
