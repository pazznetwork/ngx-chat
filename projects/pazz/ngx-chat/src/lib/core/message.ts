export interface Message {
    direction: Direction;
    body: string;
    datetime: Date;
    id?: string;
}

export enum Direction {
    in = 'in',
    out = 'out',
}
