export interface Message {
    direction: Direction;
    body: string;
    datetime: Date;
    id?: string;
    delayed: boolean;
}

export enum Direction {
    in = 'in',
    out = 'out',
}
