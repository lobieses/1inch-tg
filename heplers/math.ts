export const withDecimals = (int: number, decimals: number): number => int * 10**decimals;
export const withoutDecimals = (int: number, decimals: number): number => int / 10**decimals;

export const findExtremes = (numArray: number[]) => (
    numArray.reduce((acc, num) => {
        if(num < acc[0]) acc[0] = num;
        if(num > acc[1]) acc[1] = num;
        return acc
    }, [0, 0] as number[])
)

export const percentageDifference = (num1: number, num2: number) => {
    const firstNumPercent = 100;
    const secondNumPercent = num2 * firstNumPercent / num1;
    return  secondNumPercent - firstNumPercent;
}
