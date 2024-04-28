import Api from "~src/shared/AssistentApiClient";
import {type AssistentJournalDifference, type AssistentJournalEntry, LessonType} from "~src/shared/AssistentTypes";
import {DateTime} from 'luxon';
import type {apiJournalEntry} from "./TahvelTypes";
import AssistentCache from "~src/shared/AssistentCache";
import TahvelDom from "./TahvelDom";
import AssistentDom from "~src/shared/AssistentDom";

class TahvelJournal {
    static async fetchEntries(journalId: number): Promise<AssistentJournalEntry[]> {

        const response: apiJournalEntry[] = await Api.get(`/journals/${journalId}/journalEntriesByDate`);

        if (!response) {
            console.error("Error: Journal entries data is missing or in unexpected format");
            return;
        }

        return response.map(entry => ({
            id: entry.id,
            date: entry.entryDate,
            name: entry.nameEt,
            lessonType: entry.entryType === 'SISSEKANNE_T' ? LessonType.Lesson : (entry.entryType === 'SISSEKANNE_I' ? LessonType.IndependentWork : LessonType.Other),
            lessonCount: entry.lessons,
            firstLessonStartNumber: entry.startLessonNr
        }));
    }

    static async injectAlerts() {
        const journalHeaderElement = document.querySelector('.ois-form-layout-padding');

        if (!journalHeaderElement) {
            console.error('Journal header element not found');
            return;
        }

        // Check if alerts have already been injected
        if (journalHeaderElement.getAttribute('data-alerts-injected') === 'true') {
            return;
        }

        const journalId = parseInt(window.location.href.split('/')[5]);
        if (!journalId) {
            console.error('Journal ID ' + journalId + ' not found in URL');
            return;
        }
        const journal = AssistentCache.getJournal(journalId)
        if (!journal) {
            console.error('Journal ' + journalId + ' not found in cache');
            return;
        }
        const discrepancies = journal.differencesToTimetable

        if (discrepancies.length) {

            const sortedDiscrepancies = discrepancies.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Create a container for the alerts
            const alertsContainer = TahvelDom.createAlertContainer();

            const headerRow = TahvelDom.createAlertListHeader();
            headerRow.appendChild(TahvelDom.createDateHeader());
            headerRow.appendChild(TahvelDom.createMessageHeader());
            headerRow.appendChild(TahvelDom.createActionHeader());

            alertsContainer.appendChild(headerRow);
            journalHeaderElement.appendChild(alertsContainer);


            // If there are no journal entries for the date, but there are timetable entries, add a button to add a new journal entry
            function createActionButtonForAlert(color, text, elementOrSelector: string | HTMLElement, clickCallback) {
                console.log('createActionButtonForAlert called with color:', color, 'text:', text, 'elementOrSelector:', elementOrSelector, 'clickCallback:', clickCallback);
                const actionElement = TahvelDom.createActionElement();
                actionElement.appendChild(TahvelDom.createButton(color, text, async () => {
                    console.log('Outer click handler called')
                    const element = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) as HTMLElement : elementOrSelector;
                    if (element) {

                        element.click();
                        if (clickCallback) {
                            clickCallback();
                        }
                    }
                }));
                return actionElement;
            }

            // Iterate over the discrepancies and create an alert with the appropriate action button
            for (const discrepancy of sortedDiscrepancies) {
                console.log('Round' + discrepancy.date + ' - ' + discrepancy.timetableLessonCount + ' - ' + discrepancy.journalLessonCount + ' - ' + discrepancy.timetableFirstLessonStartNumber + ' - ' + discrepancy.journalFirstLessonStartNumber)

                const alertElement = TahvelDom.createAlert();

                // Add the date of the discrepancy
                alertElement.appendChild(TahvelDom.createAlertDate(DateTime.fromISO(discrepancy.date).toFormat('dd.LL.yyyy')));

                // Create a message for the discrepancy
                const journalMessage = TahvelJournal.createMessage(discrepancy, 'journal');
                alertElement.appendChild(TahvelDom.createMessageElement(`<table><tr><td>Tunniplaanis:</td><td>${(TahvelJournal.createMessage(discrepancy, 'timetable'))}</td></tr><tr><td>Päevikus:</td><td>${journalMessage}</td></tr></table>`));

                // Add an action button based on the discrepancy type
                if (discrepancy.timetableLessonCount > 0 && discrepancy.journalLessonCount === 0) {

                    // Add a button to ADD a new journal entry if there are no journal entries for the date, but there are timetable entries
                    alertElement.appendChild(createActionButtonForAlert('md-primary', 'Lisa', '[ng-click="addNewEntry()"]', async () => {
                        await TahvelJournal.setJournalEntryTypeAsLesson()
                        await TahvelJournal.setJournalEntryTypeAsContactLesson() // can be async
                        await TahvelJournal.setJournalEntryDate(discrepancy) // can be async
                        await TahvelJournal.setJournalEntryStartLessonNrAndCountOfLessons(discrepancy)
                    }));

                } else if (discrepancy.timetableLessonCount > 0
                    && discrepancy.journalLessonCount > 0
                    && (discrepancy.timetableLessonCount !== discrepancy.journalLessonCount || discrepancy.timetableFirstLessonStartNumber !== discrepancy.journalFirstLessonStartNumber)
                ) {

                    // Add a button to EDIT the journal entry if the number of lessons or the start lesson number is different
                    alertElement.appendChild(createActionButtonForAlert('md-accent', 'Muuda', await TahvelJournal.findJournalEntryElement(discrepancy), async () => {
                        console.log('Inner click handler called');
                        await TahvelJournal.setJournalEntryStartLessonNrAndCountOfLessons(discrepancy);
                    }));

                } else if (discrepancy.journalLessonCount > 0 && discrepancy.timetableLessonCount === 0) {

                    // Add a button to delete the journal entry if there are no timetable entries for the date, but there are journal entries
                    alertElement.appendChild(createActionButtonForAlert('md-warn', 'Vaata', await TahvelJournal.findJournalEntryElement(discrepancy), () => {
                        console.log('Delete button clicked');
                    }));
                }
                alertsContainer.appendChild(alertElement);
            }

            journalHeaderElement.appendChild(alertsContainer);
        }

        // Mark that alerts have been injected
        journalHeaderElement.setAttribute('data-alerts-injected', 'true');
    }

    static async findJournalEntryElement(discrepancy: any): Promise<HTMLElement | null> {
        const discrepancyDate = new Date(discrepancy.date);
        const day = discrepancyDate.getUTCDate().toString().padStart(2, '0');
        const month = (discrepancyDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JS
        const date = `${day}.${month}`;

        // Wait for the first <th> element to be visible
        await AssistentDom.waitForElementToBeVisible('table.journalTable th');

        // Select all <th> elements within the journal table
        const thElements = document.querySelectorAll('table.journalTable th');

        // Filter the <th> elements to only include those that contain the selected date and do not contain the text "Iseseisev töö"
        const filteredElements = Array.from(thElements).filter(th => {
            const divElement = th.querySelector('div');
            if (!divElement) return false; // If there's no <div>, skip this <th>

            const ariaLabel = divElement.getAttribute('aria-label');
            return th.textContent.includes(`${date}`) && !ariaLabel.includes("Iseseisev töö");
        });

        // If no elements found, return null
        if (filteredElements.length === 0) {
            return null;
        }

        // Select the desired span element within the first found <th> element
        const spanElement = filteredElements[0].querySelector('span[ng-if="journalEntry.entryType.code !== \'SISSEKANNE_L\'"]') as HTMLElement;
        if (!spanElement) {
            return null;
        }

        console.log("Span element found:", spanElement);
        // Return the selected span element
        return spanElement;
    }

    /*
    // Vana funktsioon - lihtsalt võrdlemiseks...

        static findJournalEntryElement(discrepancy: any): HTMLElement | null {
            const discrepancyDate = new Date(discrepancy.date);
            const day = discrepancyDate.getUTCDate().toString().padStart(2, '0');
            const month = (discrepancyDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JS
            const date = `${day}.${month}`;
            let journalEntryElement: HTMLElement | null = null;

            // Select all span elements that contain the selected date
            let spans = document.evaluate(`//span[contains(text(), ${date})]`, document, null, XPathResult.ANY_TYPE, null);

            let result = spans.iterateNext() as Element;
            while (result) {
                // Check the value of the ng-if attribute
                if (result.getAttribute('ng-if') === "journalEntry.entryType.code !== 'SISSEKANNE_L'") {
                    // This is the element you're looking for
                    journalEntryElement = result as HTMLElement;
                    break;
                }
                result = spans.iterateNext() as Element;
            }

            return journalEntryElement;
        }
    */

    static createMessage(discrepancy: any, type: string): string {
        let message;
        if (discrepancy[`${type}LessonCount`] === 0) {
            message = `${discrepancy[`${type}LessonCount`]}h`;
        } else if (discrepancy[`${type}LessonCount`] === 1) {
            message = `${discrepancy[`${type}LessonCount`]}h (${discrepancy[`${type}FirstLessonStartNumber`]} tund)`;
        } else {
            const endLessonNumber = discrepancy[`${type}FirstLessonStartNumber`] + discrepancy[`${type}LessonCount`] - 1;
            message = `${discrepancy[`${type}LessonCount`]}h (${discrepancy[`${type}FirstLessonStartNumber`]}-${endLessonNumber} tund)`;
        }
        return message;
    }

    static async setJournalEntryStartLessonNrAndCountOfLessons(discrepancy: AssistentJournalDifference): Promise<void> {

        // Select the start lesson number from the dropdownx
        console.log('Selecting start lesson number:', discrepancy.timetableFirstLessonStartNumber);
        await TahvelDom.selectDropdownOption("journalEntry.startLessonNr", discrepancy.timetableFirstLessonStartNumber.toString());
        console.log('Selected start lesson number:', discrepancy.timetableFirstLessonStartNumber);

        const timetableLessons = discrepancy.timetableLessonCount;

        // Fill the number of lessons
        console.log('Filling number of lessons:', timetableLessons);
        await TahvelDom.fillTextbox('lessons', timetableLessons.toString());
        console.log('Filled number of lessons:', timetableLessons);

        // Create a style element
        console.log('Creating blink style');
        const style = TahvelDom.createBlinkStyle();
        // Append the style element to the document head
        console.log('Appending blink style to document head');
        document.head.append(style);
        // Find the save button and add a red border to it
        console.log('Finding save button');
        const saveButton = await AssistentDom.waitForElement('button[ng-click="saveEntry()"]') as HTMLElement;
        console.log('Save button found:', saveButton);
        if (saveButton) {
            console.log('Adding blink class to save button');
            saveButton.classList.add('blink');
        }

    }

    // Function to preselect the journal entry capacity types
    static async setJournalEntryTypeAsContactLesson(): Promise<void> {
        console.log("setJournalEntryTypeAsContactLesson() called");

        // Find the checkbox with the specified aria-label
        const checkbox = await AssistentDom.waitForElement('md-checkbox[aria-label="Auditoorne õpe"]') as HTMLElement;

        if (!checkbox) {
            console.error("Checkbox not found.");
            return;
        }

        // Simulate a click on the checkbox
        checkbox.click();

        console.log("Checkbox selected successfully");

        // Make checkbox border 2px green
        checkbox.style.border = '2px solid #40ff6d';


    }

    static async setJournalEntryTypeAsLesson(): Promise<void> {
        console.log("setJournalEntryTypeAsLesson() called");
        try {
            await TahvelDom.selectDropdownOption("journalEntry.entryType", "SISSEKANNE_T");

        } catch (error) {
            console.error("An error occurred in setJournalEntryTypeAsLesson: ", error);
        }
    }

    static async setJournalEntryDate(discrepancy: AssistentJournalDifference): Promise<void> {
        console.log("setJournalEntryDate() called");

        // Find the input element with the specified class
        const datepickerInput = await AssistentDom.waitForElement('.md-datepicker-input') as HTMLInputElement;

        if (!datepickerInput) {
            console.error("Select element not found.");
            return;
        }

        // Extract only the date portion from the provided date string
        const date = new Date(discrepancy.date);
        const formattedDate = DateTime.fromJSDate(date).toFormat('dd.LL.yyyy');
        console.log("Formatted date:", formattedDate);

        if (!datepickerInput) {
            console.error("%cDatepicker input field not found.", "color: red;");
        }

        // Set the value for the datepicker input
        const dateValue = formattedDate; // Set your desired date value here
        datepickerInput.value = dateValue;
        console.log("Datepicker input filled with date:", dateValue);

        // Dispatch an input event to notify AngularJS of the input value change
        const inputEvent = new Event('input', {bubbles: true});
        datepickerInput.dispatchEvent(inputEvent);
        console.log("Input event dispatched.");

        // Make the datepicker input border green
        datepickerInput.style.border = '2px solid #40ff6d';

    }
}

export default TahvelJournal;
