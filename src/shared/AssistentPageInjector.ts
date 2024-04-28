class AssistentPageInjector {
    static inject(selector, content) {
        const element = document.querySelector(selector);
        element.innerHTML = content;
    }

    static injectWhenReady(selector, content) {
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                element.innerHTML = content;
                clearInterval(interval);
            }
        }, 100);
    }
}

