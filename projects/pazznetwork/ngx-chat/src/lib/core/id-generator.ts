export function id(): string {
    let i;
    while (!i) {
        i = Math.random()
            .toString(36)
            .substr(2, 12);
    }
    return i;
}
