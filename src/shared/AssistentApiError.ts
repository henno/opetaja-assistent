export class AssistentApiError extends Error {
    constructor(
        public statusCode: number,
        public endpoint: string,
        public message: string,
        public requestInit: RequestInit,  // Change the parameter name and type
        public response: Response,
        public log: string
    ) {
        super(message);
        Object.setPrototypeOf(this, AssistentApiError.prototype);
        this.name = 'AssistentApiError';
        this.message = message;
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.requestInit = requestInit;
        this.response = response;
        this.log = log;

        // Set the stack explicitly.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AssistentApiError);
        }

    }
}
