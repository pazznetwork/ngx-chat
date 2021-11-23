/**
 * Object.values replacement => return list of values for each key in obj
 */
export function extractValues<U>(obj: { [key: string]: U }): U[] {
    const result = [] as U[];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push(obj[key]);
        }
    }
    return result;
}

export function sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
}
