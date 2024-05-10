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

    private static async findJournalGradeElement(nameEt: string) {
    // return element which has aria-label equal to nameEt and span ng-click="editOutcome(journalEntry.curriculumModuleOutcomes)"
    // Wait for the first <th> element to be visible
    await AssistentDom.waitForElementToBeVisible('table.journalTable th');

    // Select all <th> elements within the journal table
    const thElements = document.querySelectorAll('table.journalTable th');

    // Filter the <th> elements to only include those that contain the selected date and do not contain the text "Iseseisev töö"
    const filteredElements = Array.from(thElements).filter(th => {
        const divElement = th.querySelector('div');
        if (!divElement) return false;
        // const ariaLabel = divElement.getAttribute('aria-label');
        return th.innerHTML.includes(`${nameEt}`);
    });
    if (filteredElements.length === 0) {
        return null;
    }
    const spanElement = filteredElements[0].querySelector('span[ng-click="editOutcome(journalEntry.curriculumModuleOutcomes)"]') as HTMLElement;
    if (!spanElement) {
        return null;
    }
    return spanElement;
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

    // If there are no journal entries for the date, but there are timetable entries, add a button to add a new journal entry
    static createActionButtonForAlert(color, text, elementOrSelector: string | HTMLElement, clickCallback) {
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
                    alertElement.appendChild(TahvelJournal.createActionButtonForAlert('md-primary', 'Lisa', '[ng-click="addNewEntry()"]', async () => {
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
                    alertElement.appendChild(TahvelJournal.createActionButtonForAlert('md-accent', 'Muuda', await TahvelJournal.findJournalEntryElement(discrepancy), async () => {
                        await TahvelJournal.setJournalEntryStartLessonNrAndCountOfLessons(discrepancy);
                    }));
                } else if (discrepancy.journalLessonCount > 0 && discrepancy.timetableLessonCount === 0) {

                    // Add a button to delete the journal entry if there are no timetable entries for the date, but there are journal entries
                    alertElement.appendChild(TahvelJournal.createActionButtonForAlert('md-warn', 'Vaata', await TahvelJournal.findJournalEntryElement(discrepancy), async () => {
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
            headerRow.appendChild(TahvelDom.createActionHeader());
            alertsContainer.appendChild(headerRow);
            journalHeaderElement.appendChild(alertsContainer);

            for (const missingGrade of missingGrades) {
                const alertElement = TahvelDom.createAlert();
                alertElement.appendChild(TahvelDom.createGroupGrades(`${missingGrade.nameEt}`));
                alertElement.appendChild(TahvelDom.createGradesAlertMessage(missingGrade.studentList));
                // Add a button to EDIT the journal entry if the number of lessons or the start lesson number is different
                alertElement.appendChild(TahvelJournal.createActionButtonForAlert('md-accent', 'Lisa',
                // find journal entry element which aria-label equals missingGrade.nameEt
                await TahvelJournal.findJournalGradeElement(missingGrade.nameEt), async () => {
                    // Get the selected radio button's id
                    const selectedRadioButtonId = document.querySelector('input[name="grading"]:checked').id;
                    TahvelJournal.clickRadioButton();
                    // Pass the id to the form or use it as needed
                    // For example, you can set it as a data attribute on the form
                    const formElement = document.querySelector('form[name="dialogForm"]');
                    if (formElement) {
                        formElement.setAttribute('data-selected-radio-button-id', selectedRadioButtonId);
                    }
                    // await TahvelJournal.setJournalEntryTypeAsLesson()
                    await TahvelJournal.setGrade(selectedRadioButtonId);
                }));
                alertsContainer.appendChild(alertElement);
            }

            /* Urmase liivakast */
           const alertElement1 = TahvelDom.createAlert();
            alertElement1.style.marginTop = "40px"; // Change "20px" to the amount of space you want

            // Create the first radio button
            // Get the gradingType from the journal
            const gradingType = journal.gradingType;

            // Create the first radio button
            const radioButton1 = document.createElement('input');
            radioButton1.type = 'radio';
            radioButton1.name = 'grading';
            radioButton1.value = 'Mitteeristav hindamine';
            radioButton1.id = 'mitteeristav';
            radioButton1.checked = gradingType !== "KUTSEHINDAMISVIIS_E"; // Set as default if gradingType is not "KUTSEHINDAMISVIIS_E"

            // Create a label for the first radio button
            const label1 = document.createElement('label');
            label1.htmlFor = 'mitteeristav';
            label1.textContent = 'Mitteeristav hindamine';

            // Wrap radio button and label in a div
            const div1 = document.createElement('div');
            div1.appendChild(radioButton1);
            div1.appendChild(label1);

            // Create the second radio button
            const radioButton2 = document.createElement('input');
            radioButton2.type = 'radio';
            radioButton2.name = 'grading';
            radioButton2.value = 'Eristav hindamine';
            radioButton2.id = 'eristav';
            radioButton2.checked = gradingType === "KUTSEHINDAMISVIIS_E"; // Set as default if gradingType is "KUTSEHINDAMISVIIS_E"

            // Create a label for the second radio button
            const label2 = document.createElement('label');
            label2.htmlFor = 'eristav';
            label2.textContent = 'Eristav hindamine';

            // Wrap radio button and label in a div
            const div2 = document.createElement('div');
            div2.appendChild(radioButton2);
            div2.appendChild(label2);

            // Append the divs to the alert element
            alertElement1.appendChild(div1);
            alertElement1.appendChild(div2);

            alertsContainer.appendChild(alertElement1);
            /* Urmase liivakast END */

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

    // Function to find and click the radio button
    static clickRadioButton() {
        // Find the radio button by its attributes
        const radioButton = document.querySelector('md-radio-button[aria-label="Sisestusväljana"]');

        // If the radio button is found, trigger a click event
        if (radioButton) {
            (radioButton as HTMLElement).click();
        } else {
            console.error("Radio button not found");
        }
    }

    private static async setGrade(selectedRadioButtonId) {
        const grade = selectedRadioButtonId === "eristav" ? "2" : "MA";

        await AssistentDom.waitForElementToBeVisible('form[name="dialogForm"]');

        const selectValueElements = document.querySelectorAll('.gradeAsInput');

        // Convert NodeList to Array for easier manipulation
        const elementsArray = Array.from(selectValueElements);

        // Filter out elements whose input value is empty and parentRow does not contain the specified span
        const elementsWithoutValue = elementsArray.filter(element => {
            const inputElement = element.querySelector('input') as HTMLInputElement;
            const parentRow = inputElement.closest('tr');
            const spanElement = parentRow ? parentRow.querySelector('span[ng-if="row.status === \'OPPURSTAATUS_A\'"]') : null;
            return inputElement && inputElement.value.trim() === '' && !spanElement;
        });

        // Set grade for each empty input
        elementsWithoutValue.forEach(element => {
            const inputElement = element.querySelector('input') as HTMLInputElement;
            inputElement.value = grade;
            // Dispatch an input event to notify AngularJS of the input value change
            const inputEvent = new Event('input', {bubbles: true});
            inputElement.dispatchEvent(inputEvent);

            // Make the date input border green
            inputElement.style.border = '2px solid #40ff6d';

            const parentRow = inputElement.closest('tr');
            // set current date value into input[aria-label="grade date"] which is in parentRow
            const dateInput = parentRow.querySelector('input[aria-label="grade date"]') as HTMLInputElement;

            // Log the selected date input field

            if (!dateInput) {
                console.error("Date input field not found.");
                return;
            }

            // Get today's date
            const today = new Date();

            // Format the date to the desired format (dd.mm.yyyy)
            const formattedDate = today.getDate().toString().padStart(2, '0') + '.' +
                (today.getMonth() + 1).toString().padStart(2, '0') + '.' +
                today.getFullYear();

            // Set the value for the date input
            dateInput.value = formattedDate;

            // Dispatch an input event to notify AngularJS of the input value change
            const dateInputEvent = new Event('input', {bubbles: true});
            dateInput.dispatchEvent(dateInputEvent);

            // Make the date input border green
            dateInput.style.border = '2px solid #40ff6d';

        });

    }
}

export default TahvelJournal;
