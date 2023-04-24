// SPDX-License-Identifier: AGPL-3.0-or-later
import { extractDateStringFromDate } from './utils-date';
import { expect, test } from '@playwright/test';

test.describe('date utils', () => {
  test('#extractDateStringFromDate should convert correctly ', () => {
    expect(extractDateStringFromDate(new Date(2010, 11, 5, 12))).toEqual('2010-12-05');
    expect(extractDateStringFromDate(new Date(2010, 11, 17, 12))).toEqual('2010-12-17');
  });
});
