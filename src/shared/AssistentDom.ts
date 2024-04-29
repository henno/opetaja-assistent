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

    static waitForElement(selector: string): Promise<Element | null> {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, observer) => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    observer.disconnect();
                }
            });

            observer.observe(document, {childList: true, subtree: true});

            // Optional: Set a timeout to stop observing after a certain period
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within 3 sec time limit`));
            }, 3000); // 3 seconds
        });
    }

    static async waitForElementToBeVisible(s: string, timeout = 3000): Promise<Element | null> {
        let element: Element | null = null;
        let timeoutOccurred = false;

        try {
            element = await AssistentDom.waitForElement(s);

            if (!element) {
                throw new Error(`Element ${s} not found`);
            }
        } catch (error) {
            console.error(`Error in waitForElement: ${error}`);
            throw error;
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

        try {
            return await Promise.race([observerPromise, timeoutPromise]);
        } catch (error) {
            console.error(`Error in waitForElementToBeVisible: ${error}`);
            throw error;
        }
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
}

export default AssistentDom;
