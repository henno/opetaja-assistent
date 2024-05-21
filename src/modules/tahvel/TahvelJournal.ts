import Api from "~src/shared/AssistentApiClient";
import {
    type AssistentJournal,
    type AssistentJournalDifference,
    type AssistentJournalEntry,
    type AssistentLearningOutcomes,
    LessonType
} from "~src/shared/AssistentTypes";
import {DateTime} from 'luxon';
import type {apiCurriculumModuleEntry, apiGradeEntry, apiJournalEntry} from "./TahvelTypes";
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
            lessonType: entry.entryType === 'SISSEKANNE_T' ? LessonType.lesson : (entry.entryType === 'SISSEKANNE_I' ? LessonType.independentWork : LessonType.other),
            lessonCount: entry.lessons,
            firstLessonStartNumber: entry.startLessonNr
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async findJournalEntryElement(discrepancy: any): Promise<HTMLElement | null> {

        // Extract and format the discrepancy date as 'dd.mm'
        const discrepancyDate = new Date(discrepancy.date);
        const day = discrepancyDate.getUTCDate().toString().padStart(2, '0');
        const month = (discrepancyDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const formattedDate = `${day}.${month}`;

        // Find the table header containing the formatted date and no 'Iseseisev töö' div
        const th = Array.from(document.querySelectorAll('table.journalTable th')).find(th => {
            const hasTheDate = Array.from(th.querySelectorAll('span')).some(span => span.textContent.includes(formattedDate));
            const isNotIndependentWork = !th.querySelector('div[aria-label*="Iseseisev töö"]');
            return hasTheDate && isNotIndependentWork;
        });

        // Extract and return the target span element if found, otherwise return null
        const targetSpan = th?.querySelector('span[ng-if="journalEntry.entryType.code !== \'SISSEKANNE_L\'"]') as HTMLElement;
        return targetSpan || null;
    }

    static async getJournalWithValidation(): Promise<AssistentJournal | null> {
        const journalId = parseInt(window.location.href.split('/')[5]);

        if (!journalId) {
            console.error('Journal ID ' + journalId + ' not found in URL');
            return null;
        }
        const journal = AssistentCache.getJournal(journalId)
        if (!journal) {
            console.error('Journal ' + journalId + ' not found in cache');
            return null;
        }

        return journal;
    }

    static async addLessonDiscrepanciesTable() {
        const journalHeaderElement = document.querySelector('.ois-form-layout-padding') as HTMLElement;

        if (!journalHeaderElement) {
            console.error('Journal header element not found to inject lesson discrepancies table');
            return;
        }

        const journal = await TahvelJournal.getJournalWithValidation();
        if (!journal) {
            return;
        }

        if (journal.differencesToTimetable.length) {

            const sortedDiscrepancies = journal.differencesToTimetable.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Create a skeleton for the table
            const lessonDiscrepanciesTable = AssistentDom.createStructure(`
                <table id="assistent-discrepancies-table" class="assistent-table">
                    <caption>Ebakõlad võrreldes tunniplaaniga</caption>
                    <thead>
                    <tr>
                        <th rowspan="2">Kuupäev</th>
                        <th>Algustund</th>
                        <th>Tundide arv</th>
                        <th rowspan="2">Tegevus</th>
                    </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>`);

            journalHeaderElement.appendChild(lessonDiscrepanciesTable);

            // Wait for the first <td> element to be visible
            try {
                await AssistentDom.waitForElement('table.journalTable tbody tr td');
            } catch (e) {
                console.error('tableJournalTable NOT FOUND!' + e.message);
                return;
            }

            // Iterate over the discrepancies and create a row with the appropriate action button
            for (const discrepancy of sortedDiscrepancies) {
                const dateText = DateTime.fromISO(discrepancy.date).toFormat('dd.LL.yyyy');

                let startLessonText: string | number;
                if (discrepancy.journalFirstLessonStartNumber === 0 || discrepancy.journalFirstLessonStartNumber === discrepancy.timetableFirstLessonStartNumber) {
                    startLessonText = discrepancy.timetableFirstLessonStartNumber;
                } else {
                    startLessonText = `<del>${discrepancy.journalFirstLessonStartNumber}</del><ins>${discrepancy.timetableFirstLessonStartNumber}</ins>`;
                }

                let lessonCountText: string | number;
                if (discrepancy.journalLessonCount === 0 || discrepancy.journalLessonCount === discrepancy.timetableLessonCount) {
                    lessonCountText = discrepancy.timetableLessonCount;
                } else {
                    lessonCountText = `<del>${discrepancy.journalLessonCount}</del><ins>${discrepancy.timetableLessonCount}</ins>`;
                }

                const button = await TahvelJournal.createActionButtonForLessonDiscrepancyAction(discrepancy);

                // Create a row for the table
                const tr = AssistentDom.createStructure(`
                    <tr>
                        <td>${dateText}</td>
                        <td>${startLessonText}</td>
                        <td>${lessonCountText}</td>
                        <td></td>
                    </tr>`);

                // Append the button to the last cell in the row
                tr.querySelector('td:last-child').appendChild(button);

                // Append the row to the table body
                lessonDiscrepanciesTable.querySelector('tbody').appendChild(tr);
            }
        }
        // Mark that lesson discrepancies table has been injected
        journalHeaderElement.dataset.lessonDiscrepanciesTableIsInjected = 'true';
    }

    static async addMissingGradesTable() {
        const journalHeaderElement = document.querySelector('div[ng-if="journal.hasJournalStudents"]');
        if (!journalHeaderElement || journalHeaderElement.getAttribute('data-lesson-discrepancies-table-is-injected') === 'true') return;

        const journal = await TahvelJournal.getJournalWithValidation();
        if (!journal || journal.missingGrades.length === 0 || journal.contactLessonsPlanned > journal.entriesInTimetable.length) return;

        const missingGradesTable = AssistentDom.createStructure(`
            <div id="assistent-grades-table-container">
                <table id="assistent-grades-table" class="assistent-table">
                    <caption>Puuduvad hinded</caption>
                    <thead>
                        <tr>
                            <th rowspan="2">Õpiväljund</th>
                            <th>Hindeta õpilased</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${journal.missingGrades.map(({name, studentList}) => `
                            <tr>
                                <td class="align-left">${name}</td>
                                <td class="align-left">${studentList.map(({name}) => name).join(', ')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`);

        journalHeaderElement.before(missingGradesTable);
    }

    static async setJournalEntryStartLessonNr(discrepancy: AssistentJournalDifference): Promise<void> {

        // Select the start lesson number from the dropdown
        await TahvelDom.selectDropdownOption("journalEntry.startLessonNr", discrepancy.timetableFirstLessonStartNumber.toString());

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

    static async setJournalEntryCountOfLessons(discrepancy: AssistentJournalDifference): Promise<void> {
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
                name: entry.nameEt,
                curriculumModuleOutcomes: entry.curriculumModuleOutcomes,
                entryType: entry.entryType,
                studentOutcomeResults: Object.values(entry.studentOutcomeResults || {}).map((result: apiGradeEntry) => ({
                    studentId: result.studentId,
                }))
            }));
    }

    private static async createActionButtonForLessonDiscrepancyAction(discrepancy: AssistentJournalDifference) {
        const isLessonsInDiaryButNotInTimetable = discrepancy.journalLessonCount > 0 && discrepancy.timetableLessonCount === 0;
        const isLessonsInTimetableButNotInDiary = discrepancy.timetableLessonCount > 0 && discrepancy.journalLessonCount === 0;

        let journalEntryElement: HTMLElement;

        try {
            journalEntryElement = await TahvelJournal.findJournalEntryElement(discrepancy);
        } catch (e) {
            console.error('Journal entry element not found: ' + e.message);
            return;
        }

        const action = {
            color: "",
            text: "",
            elementOrSelector: journalEntryElement,
            callback: async () => {
            },
        };

        if (isLessonsInDiaryButNotInTimetable) {
            action.color = "md-warn";
            action.text = "Vaata sissekannet";
            action.callback = async () => {
                const style = TahvelDom.createBlinkStyle();
                document.head.append(style);
                const deleteButton = await AssistentDom.waitForElement('button[ng-click="delete()"]') as HTMLElement;
                if (deleteButton) {
                    deleteButton.classList.add('blink');
                }
            };
        } else if (isLessonsInTimetableButNotInDiary) {
            action.color = "md-primary";
            action.text = "Lisa sissekanne";
            action.elementOrSelector = await AssistentDom.waitForElement('button[ng-click="addNewEntry()"]') as HTMLElement;

            if (!action.elementOrSelector) {
                // debugger;
                console.error("Add button not found");
                return;
            }
            action.callback = async () => {
                await TahvelJournal.setJournalEntryTypeAsLesson();
                await TahvelJournal.setJournalEntryDate(discrepancy);
                await TahvelJournal.setJournalEntryTypeAsContactLesson();
                await TahvelJournal.setJournalEntryStartLessonNr(discrepancy);
                await TahvelJournal.setJournalEntryCountOfLessons(discrepancy);
            };
        } else {
            action.color = "md-accent";
            action.text = "Muuda sissekannet";
            action.callback = async () => {
                if (discrepancy.journalFirstLessonStartNumber !== discrepancy.timetableFirstLessonStartNumber) {
                    await TahvelJournal.setJournalEntryStartLessonNr(discrepancy);
                }
                if (discrepancy.journalLessonCount !== discrepancy.timetableLessonCount) {
                    await TahvelJournal.setJournalEntryCountOfLessons(discrepancy);
                }
            };
        }

        return TahvelDom.createActionButton(
            action.color,
            action.text,
            action.elementOrSelector,
            action.callback
        );
    }
}

export default TahvelJournal;
