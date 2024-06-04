export class AssistentDetailedError extends Error {
    code: number;
    title: string;

    constructor(code: number, title: string, message: string) {
        super(message);
        this.code = code
        this.title = title
        this.message = message
    }
}
