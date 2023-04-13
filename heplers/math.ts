// @ts-ignore
export const withDecimals = (int: number, decimals: number): number => (Math.round(int * 10**decimals)).toLocaleString('fullwide', {useGrouping:false});
// @ts-ignore
export const withoutDecimals = (int: number, decimals: number): number => +((int / 10**decimals).toString().match(/^-?\d+(?:\.\d{0,6})?/)[0]);

export const findExtremes = (numArray: number[]) => (
    numArray.reduce((acc, num) => {
        if(acc[0] ? num < acc[0] : num) acc[0] = num;
        if(acc[1] ? num > acc[1] : num) acc[1] = num;
        return acc
    }, [null, null] as number[] | null[]) as unknown as number[]
)

export const percentageDifference = (num1: number, num2: number) => {
    const firstNumPercent = 100;
    const secondNumPercent = num2 * firstNumPercent / num1;
    return secondNumPercent - firstNumPercent;
}
