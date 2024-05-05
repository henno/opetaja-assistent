import AssistentDom from "~src/shared/AssistentDom";
import type {student} from "~src/shared/AssistentTypes";

class TahvelDom {
    static createExclamationMark(id: string, color: string, innerHTML: string, title: string): HTMLSpanElement {
        const exclamationMark = document.createElement('span');
        exclamationMark.id = id;
        exclamationMark.style.color = color;
        exclamationMark.style.fontWeight = 'bold';
        exclamationMark.innerHTML = innerHTML;
        exclamationMark.style.paddingLeft = '5px';
        exclamationMark.title = title;
        exclamationMark.style.fontSize = '1.3em';

        return exclamationMark;
    }

    static createButton(className: string, textContent: string, clickHandler: () => void): HTMLButtonElement {
        className = 'md-raised md-button md-ink-ripple ' + className;
        return AssistentDom.createButton(className, textContent, clickHandler);
    }

    static createAlertContainer(alertClassName, marginleft) {
        return AssistentDom.createElement('article', {
            className: alertClassName,
            style: {
                display: 'table',
                border: '1px solid #ccc',
                backgroundColor: '#f9f9f9',
                padding: '20px',
                paddingRight: '30px',
                margin: '10px',
                marginLeft: marginleft,
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

    static createActionHeader() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        }, 'Tegevus');
    }

    static createActionElement() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        });
    }

    static createBlinkStyle() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                0% {opacity: 1;}
                50% {opacity: 0;}
                100% {opacity: 1;}
            }
    
            .blink {
                animation: blink 1s linear 3;
                border: 3px solid red;
            }
        `;
        return style;
    }

    static async selectDropdownOption(model: string, value: string): Promise<void> {

        // Find the select element using the model name
        const mdSelectSelector = `md-select[ng-model="${model}"]`;
        const selectElement = await AssistentDom.waitForElementToBeVisible(mdSelectSelector) as HTMLSelectElement
        if (!selectElement) {
            console.error("Select `${mdSelectSelector}` not found.");
            return;
        }

        // Click the dropdown to open it
        selectElement.click();

        // Dispatch a mousedown event to notify AngularJS of the select open
        const mouseEvent = new MouseEvent('mousedown', {bubbles: true});
        selectElement.dispatchEvent(mouseEvent);

        const mdContentId = await AssistentDom.waitForAttributeToAppear(selectElement, 'aria-owns');
        const mdContentSelector = `md-content[id="${mdContentId}"]`
        const mdContentElement = await AssistentDom.waitForElementToBeVisible(mdContentSelector) as HTMLElement;
        if (!mdContentElement) {
            console.error('Element ' + mdContentSelector + ' not found.');
            return;
        }

        // Find and option element with the desired value
        const mdOptionSelector = `${mdContentSelector} md-option[value="${value}"]`;
        const optionElement = await AssistentDom.waitForElement(mdOptionSelector) as HTMLElement;
        if (!optionElement) {
            console.error('Option element ' + mdOptionSelector + ' not found.');
            return;
        }

        // Make the right option background green
        optionElement.style.backgroundColor = '#40ff6d';

        // Make sure the option is in view
        optionElement.scrollIntoView();

        // Allow browser to complete rendering, then click the option.
        await new Promise(resolve => setTimeout(resolve, 200));

        // Click it
        optionElement.click();

        // Dispatch a click event to notify AngularJS of the option selection
        const clickEvent = new MouseEvent('click', {bubbles: true});
        optionElement.dispatchEvent(clickEvent);

        // Make md-select border green
        selectElement.style.border = '2px solid #40ff6d';

    }

    static async fillTextbox(inputNameLessons: string, value: string): Promise<void> {
        const inputElement = await AssistentDom.waitForElementToBeVisible(`input[name="${inputNameLessons}"]`) as HTMLInputElement;
        if (!inputElement) {
            console.error(`Input element not found for name ${inputNameLessons}.`);
            return;
        }
        inputElement.value = value.toString();

        // Dispatch an input event to notify AngularJS of the input value change
        const inputEvent = new Event('input', {bubbles: true});
        inputElement.dispatchEvent(inputEvent);

        // Make the input border green
        inputElement.style.border = '2px solid #40ff6d';

    }

    static createGradesHeader() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        }, 'Õpiväljundid');
    }

    static createGroupGrades(name_et: string) {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left',
                maxWidth: '30%'
            }
        }, name_et);
    }

    static createStudentsWithoutGradesListHeader() {
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left'
            }
        }, 'Hindeta õpilased');
    }

    static createGradesAlertMessage(studentList: student[]) {
        const message = studentList.map(student => student.fullname).join(', ');
        return AssistentDom.createElement('div', {
            style: {
                display: 'table-cell',
                padding: '2px',
                textAlign: 'left',
                maxWidth: '30%'
            }
        }, message);
    }
}


export default TahvelDom;
