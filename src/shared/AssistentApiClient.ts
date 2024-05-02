import {AssistentDetailedError} from "./AssistentDetailedError";

class AssistentApiClient {

    static url: string;

    static extractBaseUrl(): string {
        const url = window.location.href;
        const hashIndex = url.indexOf('#');
        return url.substring(0, hashIndex !== -1 ? hashIndex : undefined);
    }

    static async get(endpoint: string) {
        return AssistentApiClient.request('GET', endpoint);
    }

    static async post(endpoint: string, body: object) {
        return AssistentApiClient.request('POST', endpoint, body);
    }

    static async request(method: string, endpoint: string, body: object | null = null) {
        const options = {
            method: method,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        };
        if (body !== null) {
            options['body'] = JSON.stringify(body);
        }
        const response = await fetch(AssistentApiClient.url + endpoint, options);

        let responseBody: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let responseJson: any;

        try {

            // JSON parsing
            responseBody = await response.text();
            responseJson = JSON.parse(responseBody);

            // Handle JSON parsing errors
        } catch (e) {

            // Just empty response body
            if (!responseBody) {
                throw new AssistentDetailedError(
                    response.status,
                    `Error ${response.status}`,
                    'The data received from the server was empty which means that something went wrong. We apologize for the inconvenience. Please try again later.'
                );
            }

            // Non-JSON response
            throw new AssistentDetailedError(
                response.status,
                `Error ${response.status}`,
                'The data received from the server was not in JSON format which means that something went wrong. We apologize for the inconvenience. Please try again later.'
            );

        }

        // Handle HTTP errors
        if (!response.ok) {

            // Check that the response body contains the expected fields
            if (!responseJson.title || !responseJson.message) {
                throw new AssistentDetailedError(
                    response.status,
                    `Error ${response.status}`,
                    'The data received from the server did not contain the expected fields which means that something went wrong. We apologize for the inconvenience. Please try again later.'
                );
            }

            // Normal 4xx errors will reach here
            throw new AssistentDetailedError(
                response.status,
                `Error ${response.status}: ${responseJson.title}`,
                responseJson.message
            );

        }

        // Return the response body when the response is OK
        return responseJson

    }
}

export default AssistentApiClient;


