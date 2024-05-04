import Api from "~src/shared/AssistentApiClient";
import {
    type AssistentLearningOutcomes,
    type AssistentJournalDifference,
    type AssistentJournalEntry,
    LessonType
} from "~src/shared/AssistentTypes";
import {DateTime} from 'luxon';
import type {apiJournalEntry} from "./TahvelTypes";
import AssistentCache from "~src/shared/AssistentCache";
import TahvelDom from "./TahvelDom";
import AssistentDom from "~src/shared/AssistentDom";
import type {apiCurriculumModuleEntry, apiGradeEntry} from "./TahvelTypes";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Return the selected span element
        return spanElement;
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
            const alertsContainer = TahvelDom.createAlertContainer('alertDiscrepancies', '0px');

            const headerRow = TahvelDom.createAlertListHeader();
            headerRow.appendChild(TahvelDom.createDateHeader());
            headerRow.appendChild(TahvelDom.createMessageHeader());
            headerRow.appendChild(TahvelDom.createActionHeader());

            alertsContainer.appendChild(headerRow);
            journalHeaderElement.appendChild(alertsContainer);


            // If there are no journal entries for the date, but there are timetable entries, add a button to add a new journal entry
            function createActionButtonForAlert(color, text, elementOrSelector: string | HTMLElement, clickCallback) {
                const actionElement = TahvelDom.createActionElement();
                actionElement.appendChild(TahvelDom.createButton(color, text, async () => {
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
                        await TahvelJournal.setJournalEntryStartLessonNrAndCountOfLessons(discrepancy);
                    }));

                } else if (discrepancy.journalLessonCount > 0 && discrepancy.timetableLessonCount === 0) {

                    // Add a button to delete the journal entry if there are no timetable entries for the date, but there are journal entries
                    alertElement.appendChild(createActionButtonForAlert('md-warn', 'Vaata', await TahvelJournal.findJournalEntryElement(discrepancy), async () => {
                        // Create a style element
                        const style = TahvelDom.createBlinkStyle();
                        // Append the style element to the document head
                        document.head.append(style);
                        // Find the save button and add a red border to it
                        const deleteButton = await AssistentDom.waitForElement('button[ng-click="delete()"]') as HTMLElement;
                        if (deleteButton) {
                            deleteButton.classList.add('blink');
                        }
                    }));
                }
                alertsContainer.appendChild(alertElement);
            }
            journalHeaderElement.appendChild(alertsContainer);
        }
        // Mark that alerts have been injected
        journalHeaderElement.setAttribute('data-alerts-injected', 'true');
    }

    static async injectMissingGradesAlerts() {
        const journalHeaderElement = document.querySelector('div[ng-if="journal.hasJournalStudents"]');

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
        const missingGrades = journal.missingGrades
        // compare entriesInTimetableLength with contactLessonsPlanned and  if contactLessonsPlanned <= entriesInTimetableLength then inject alert after journalHeaderElement containing missing grades
        if (missingGrades.length > 0 && journal.contactLessonsPlanned <= journal.entriesInTimetable.length) {
            const alertsContainer = TahvelDom.createAlertContainer('alertMissingGrades', '20px');
            const headerRow = TahvelDom.createAlertListHeader();
            headerRow.appendChild(TahvelDom.createGradesHeader());
            headerRow.appendChild(TahvelDom.createStudentsWithoutGradesListHeader());
            alertsContainer.appendChild(headerRow);
            journalHeaderElement.appendChild(alertsContainer);
            for (const missingGrade of missingGrades) {
                const alertElement = TahvelDom.createAlert();
                alertElement.appendChild(TahvelDom.createGroupGrades(`${missingGrade.nameEt}`));
                alertElement.appendChild(TahvelDom.createGradesAlertMessage(missingGrade.studentList));
                alertsContainer.appendChild(alertElement);
            }
            journalHeaderElement.before(alertsContainer);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        await TahvelDom.selectDropdownOption("journalEntry.startLessonNr", discrepancy.timetableFirstLessonStartNumber.toString());

        const timetableLessons = discrepancy.timetableLessonCount;

        // Fill the number of lessons
        await TahvelDom.fillTextbox('lessons', timetableLessons.toString());

        // Create a style element
        const style = TahvelDom.createBlinkStyle();
        // Append the style element to the document head
        document.head.append(style);
        // Find the save button and add a red border to it
        const saveButton = await AssistentDom.waitForElement('button[ng-click="saveEntry()"]') as HTMLElement;
        if (saveButton) {
            saveButton.classList.add('blink');
        }

    }

    // Function to preselect the journal entry capacity types
    static async setJournalEntryTypeAsContactLesson(): Promise<void> {

        // Find the checkbox with the specified aria-label
        const checkbox = await AssistentDom.waitForElement('md-checkbox[aria-label="Auditoorne õpe"]') as HTMLElement;

        if (!checkbox) {
            console.error("Checkbox not found.");
            return;
        }

        // Simulate a click on the checkbox
        checkbox.click();


        // Make checkbox border 2px green
        checkbox.style.border = '2px solid #40ff6d';


    }

    static async setJournalEntryTypeAsLesson(): Promise<void> {
        try {
            await TahvelDom.selectDropdownOption("journalEntry.entryType", "SISSEKANNE_T");

        } catch (error) {
            console.error("An error occurred in setJournalEntryTypeAsLesson: ", error);
        }
    }

    static async setJournalEntryDate(discrepancy: AssistentJournalDifference): Promise<void> {

        // Find the input element with the specified class
        const datepickerInput = await AssistentDom.waitForElement('.md-datepicker-input') as HTMLInputElement;

        if (!datepickerInput) {
            console.error("Select element not found.");
            return;
        }

        // Extract only the date portion from the provided date string
        const date = new Date(discrepancy.date);
        const formattedDate = DateTime.fromJSDate(date).toFormat('dd.LL.yyyy');

        if (!datepickerInput) {
            console.error("%cDatepicker input field not found.", "color: red;");
        }

        // Set the value for the datepicker input
        datepickerInput.value = formattedDate;

        // Dispatch an input event to notify AngularJS of the input value change
        const inputEvent = new Event('input', {bubbles: true});
        datepickerInput.dispatchEvent(inputEvent);

        // Make the datepicker input border green
        datepickerInput.style.border = '2px solid #40ff6d';

    }

    static async fetchLearningOutcomes(journalId: number): Promise<AssistentLearningOutcomes[]> {
        const response: apiCurriculumModuleEntry[] = await Api.get(`/journals/${journalId}/journalEntriesByDate`);

        if (!response) {
            console.error("Error: Journal entries data is missing or in unexpected format");
            return;
        }

        return response
            .filter(entry => entry.entryType === 'SISSEKANNE_O' || entry.entryType === 'SISSEKANNE_L')
            .map(entry => ({
                journalId: journalId,
                nameEt: entry.nameEt,
                curriculumModuleOutcomes: entry.curriculumModuleOutcomes,
                entryType: entry.entryType,
                studentOutcomeResults: Object.values(entry.studentOutcomeResults || {}).map((result: apiGradeEntry) => ({
                    studentId: result.studentId,
                }))
            }));
    }
}

export default TahvelJournal;
