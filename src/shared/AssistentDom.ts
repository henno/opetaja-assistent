import {AssistentDetailedError} from "~src/shared/AssistentDetailedError";

class AssistentDom {
    static createButton(className: string, textContent: string, clickHandler: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = textContent;
        button.addEventListener('click', clickHandler);
        return button;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createElement(type: string, attributes: { [key: string]: any }, textContent?: string): HTMLElement {
        const element = document.createElement(type);

        for (const key in attributes) {
            if (key === 'style') {
                for (const styleKey in attributes[key]) {
                    element.style[styleKey] = attributes[key][styleKey];
                }
            } else {
                element[key] = attributes[key];
            }
        }

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    static async waitForElement(selector, timeout = 2000): Promise<HTMLElement> {

        return new Promise((resolve, reject) => {

            // Initial check for the element
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            let resolved = false;

            // Poll for the element every 100ms (can't use MutationObserver because it doesn't detect all changes)
            const intervalId = setInterval(() => {
                const targetElement = document.querySelector(selector);
                if (targetElement) {
                    if (!resolved) {
                        resolved = true;
                        clearInterval(intervalId);
                        resolve(targetElement);
                    }
                }
            }, 100);

            // Stop polling after the timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    clearInterval(intervalId);

                    const targetElement = document.querySelector(selector);
                    if (targetElement) {
                        resolve(targetElement);
                    } else {
                        reject(new Error(`Element ${selector} not found within ${timeout / 1000} sec time limit`));
                    }
                }
            }, timeout);
        });
    }

    static async waitForElementToBeVisible(s: string, timeout = 3000): Promise<Element | null> {
        let element: Element | null = null;
        let timeoutOccurred = false;

        element = await AssistentDom.waitForElement(s);

        if (!element) {
            throw new AssistentDetailedError(500, 'Element not found', `Element ${s} not found.`);
        }

        let observer: IntersectionObserver;

        const observerPromise = new Promise<Element | null>((resolve, reject) => {
            observer = new IntersectionObserver((entries, observer) => {
                if (entries.length > 0 && entries[0].isIntersecting && getComputedStyle(entries[0].target).display !== 'none') {
                    observer.disconnect();
                    resolve(element);
                } else if (timeoutOccurred) {
                    reject(new Error(`Element ${s} is not intersecting or is hidden`));
                }
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 1.0
            });

            observer.observe(element!);
        });

        const timeoutPromise = new Promise<Element | null>((_, reject) => {
            setTimeout(() => {
                timeoutOccurred = true;
                observer.disconnect();
                reject(new Error(`Timeout: Element ${s} not visible within ${timeout}ms`));
            }, timeout);
        });
        return await Promise.race([observerPromise, timeoutPromise]);
    }

    static async waitForAttributeToAppear(element: Element, attribute: string, timeout: number = 3000): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const observer = new MutationObserver((mutations, observer) => {
                const attrValue = element.getAttribute(attribute);
                if (attrValue) {
                    observer.disconnect();
                    resolve(attrValue);
                }
            });
            observer.observe(element, {attributes: true});

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`${attribute} attribute not found within ${timeout} milliseconds`));
            }, timeout);
        });
    }

    static createStructure(html: string): HTMLElement | null {
        // Check if the HTML string starts with a 'tr' tag
        const startsWithTr = html.trim().startsWith('<tr');

        // If the HTML string starts with a 'tr' tag, wrap it in table tags
        if (startsWithTr) {
            html = `<table>${html}</table>`;
        }

        // Create a temporary div element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html.trim();

        // Check if the HTML string is valid and contains only one root element
        if (tempDiv.childNodes.length !== 1) {
            throw new AssistentDetailedError(500, 'Invalid HTML', 'HTML string must contain exactly one root element');
        }

        // Get the root element
        let rootElement = tempDiv.firstChild as HTMLElement;

        // If the HTML string started with a 'tr' tag, the root element will be a table
        // In this case, get the first 'tr' element from the table
        if (startsWithTr && rootElement.tagName.toLowerCase() === 'table') {
            rootElement = rootElement.querySelector('tr') as HTMLElement;
        }

        return rootElement;
    }

    static showErrorMessage(title: string, message: string, code: number): void {

        const messageBox = document.body.appendChild(AssistentDom.createStructure(`
            <div class="assistent-message-box">
                <div class="assistent-message-box-title">Õpetaja assistent viga ${code}</div>
                <div class="assistent-message-box-message">${title}<br><br><pre>${message}</pre></div>
                <button class="assistent-message-box-close-button">Close</button>
            </div>
        `));
        messageBox.querySelector('.assistent-message-box-close-button').addEventListener('click', () => {
            messageBox.remove();
        });

    }
}

export default AssistentDom;
