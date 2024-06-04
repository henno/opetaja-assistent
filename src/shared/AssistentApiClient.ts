import {AssistentApiError} from "~src/shared/AssistentApiError";

class AssistentApiClient {
    static url: string = AssistentApiClient.extractBaseUrl();

    static extractBaseUrl(): string {
        const url = window.location.href;
        const hashIndex = url.indexOf('#');
        return url.substring(0, hashIndex !== -1 ? hashIndex : undefined);
    }


    // eslint-disable-next-line
    static async get(endpoint: string): Promise<any> {
        return AssistentApiClient.request('GET', endpoint);
    }

    // eslint-disable-next-line
    static async request(method: string, endpoint: string, body: object | null = null): Promise<any> {
        const headers = new Headers({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        });

        let requestBody: string | null = null;

        if (body !== null) {
            requestBody = JSON.stringify(body);
            headers.append('Content-Length', new Blob([requestBody]).size.toString());
        }

        // Create a Request object
        const request = new Request(AssistentApiClient.url + endpoint, {
            method: method,
            headers: headers,
            body: requestBody
        });

        // Fetch using the Request object
        const response = await fetch(request);
        const responseBody = await response.text();

        // Check response validity
        if (!response.ok) {
            const log = this.getHTTPRequestResponseLog(
                method, endpoint, headers, response, requestBody, responseBody);

            console.error(log);
            throw new AssistentApiError(
                response.status,
                endpoint,
                log,
                request,  // Pass the Request object here
                response,
                log
            );
        }

        return responseBody ? JSON.parse(responseBody) : {};
    }

    private static getHTTPRequestResponseLog(method: string, endpoint: string, headers: Headers, response: Response, requestBody: string | null, responseBody: string): string {
        let requestHeadersLog = `${method} ${endpoint} HTTP/1.1\n`;
        // Log request headers
        headers.forEach((value, key) => {
            requestHeadersLog += `${key}: ${value}\n`;
        });

        let responseHeadersLog = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
        // Log response headers
        response.headers.forEach((value, key) => {
            responseHeadersLog += `${key}: ${value}\n`;
        });

        // Formatting request and response body
        const formattedRequestBody = requestBody ? `\n${requestBody}\n` : '\n(empty request body)\n';
        const formattedResponseBody = responseBody ? `\n${responseBody}\n` : '\n(empty response body)\n';

        return `${requestHeadersLog}${formattedRequestBody}\n\n${responseHeadersLog}${formattedResponseBody}`;
    }
}

export default AssistentApiClient;
