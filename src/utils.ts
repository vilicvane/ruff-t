interface Dictionary<T> {
    [key: string]: T;
}

const hop = Object.prototype.hasOwnProperty;

const styleSequenceMap: Dictionary<[number, number]> = {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49]
};

export function stylize(text: string, styleName: string): string {
    if (hop.call(styleSequenceMap, styleName)) {
        let sequence = styleSequenceMap[styleName];
        return `\u001b[${styleSequenceMap[styleName][0]}m${text}\u001b[${styleSequenceMap[styleName][1]}m`;
    } else {
        return text;
    }
}

export function indent(text: string, level: number) {
    let prefix = Array(level + 1).join('  ');
    return text.replace(/^/gm, prefix);
}

export function delay(timeout: number): Promise<void>;
export function delay<T>(timeout: number, value: T): Promise<T>;
export function delay<T>(timeout: number, value?: T): Promise<T> {
    return new Promise<T>(resolve => setTimeout(resolve, timeout, value));
}
