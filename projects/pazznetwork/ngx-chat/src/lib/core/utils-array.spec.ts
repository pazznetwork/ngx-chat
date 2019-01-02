import { findSortedInsertionIndexLast, insertSortedLast } from './utils-array';

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

});
