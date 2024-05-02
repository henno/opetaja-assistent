import AssistentDom from "~src/shared/AssistentDom";

class TahvelDom {
    static createAlertContainer() {
        return AssistentDom.createElement('article', {
            className: 'alert-container',
            style: {
                display: 'table',
                border: '1px solid #ccc',
                backgroundColor: '#f9f9f9',
                padding: '20px',
                paddingRight: '30px'
            }
        });
    }

    static createAlertListHeader() {
        return AssistentDom.createElement('section', {
            style: {
                display: 'table-row',
                margin: '20px',
                marginRight: '30px',
                fontWeight: 'bold'
            }
        });
    }

    static createAlert() {
        return AssistentDom.createElement('section', {
            style: {
                display: 'table-row',
                margin: '20px',
                marginRight: '30px'
            },
            role: 'alert'
            // alertElement.setAttribute('role', 'alert');
        });
    }

    static createDateHeader() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        }, 'Kuupäev');
    }

    static createAlertDate(date: string) {
        return AssistentDom.createElement('time', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            },
            className: 'alert-date'
        }, date);
    }

    static createMessageHeader() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        }, 'Probleemid');
    }

    static createMessageElement(message: string) {
        const element = AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            },
            className: 'alert-message'
        });
        element.innerHTML = message;
        return element;
    }

}


export default TahvelDom;
