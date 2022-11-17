import { extractDateStringFromDate } from './utils-date';

describe('date utils', () => {

    it('#extractDateStringFromDate should convert correctly ', () => {
        expect(extractDateStringFromDate(new Date(2010, 11, 5, 12))).toEqual('2010-12-05');
        expect(extractDateStringFromDate(new Date(2010, 11, 17, 12))).toEqual('2010-12-17');
    });

});
