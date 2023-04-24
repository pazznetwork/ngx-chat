// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  findSortedIndex,
  findSortedInsertionIndexLast,
  insertSortedLast,
  removeDuplicates,
} from './utils-array';
import { expect, test } from '@playwright/test';

test.describe('array utils', () => {
  test.describe('#findSortedInsertionIndexLast', () => {
    test('should find correct index if multiple same items occur', () => {
      const list = [1, 5, 5, 5, 5, 5, 5, 9];
      expect(findSortedInsertionIndexLast(1, list)).toEqual(1);
      expect(findSortedInsertionIndexLast(5, list)).toEqual(7);
      expect(findSortedInsertionIndexLast(9, list)).toEqual(8);
    });

    test('should return if element does not exist', () => {
      expect(findSortedInsertionIndexLast(5, [])).toEqual(0);
      expect(findSortedInsertionIndexLast(5, [1])).toEqual(1);
    });
  });

  test.describe('#insertSortedLast', () => {
    test('should insert elements and sort the list correctly', () => {
      const list: number[] = [];
      const numbers = [5, 1, 7, 9, 123, -23, -24, 0, 0, 0];
      for (const num of numbers) {
        insertSortedLast(num, list);
        const sortedCopy = new Array<number>().concat(list).sort();
        expect(list).toEqual(sortedCopy);
      }
    });
  });

  test.describe('#findSortedIndex', () => {
    test('should find the correct index of an element in a sorted list', () => {
      expect(findSortedIndex(-50, [-50, 2, 100])).toEqual(0);
      expect(findSortedIndex(2, [-50, 2, 100])).toEqual(1);
      expect(findSortedIndex(100, [-50, 2, 100])).toEqual(2);
      expect(findSortedIndex(42, [-50, 2, 100])).toEqual(-1);
    });
  });

  test.describe('#removeDuplicates', () => {
    test('should not remove non-duplicates', () => {
      expect(removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);
    });

    test('should remove duplicates', () => {
      expect(removeDuplicates([1, 2, 3, 1, 2, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates([1, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual([1]);
      expect(removeDuplicates([3, 2, 1, 1, 1])).toEqual([3, 2, 1]);
      expect(removeDuplicates([3, 1, 2, 3])).toEqual([3, 1, 2]);
    });

    test('should remove duplicates by custom equality function', () => {
      expect(
        removeDuplicates([{ a: 'test' }, { a: 'test' }, { a: 'test2' }], (x, y) => x.a === y.a)
      ).toEqual([{ a: 'test' }, { a: 'test2' }]);
    });
  });
});
