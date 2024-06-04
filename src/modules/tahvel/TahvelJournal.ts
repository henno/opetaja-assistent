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
import {AssistentDetailedError} from "~src/shared/AssistentDetailedError";


class TahvelJournal {
    static async fetchEntries(journalId: number): Promise<AssistentJournalEntry[]> {

        let response: apiJournalEntry[];

        try {

            response = await Api.get(`/journals/${journalId}/journalEntriesByDate`);

        } catch (e) {

            // If 412 then we don't have permission to read this particular journal and we should just skip it
            if (e.statusCode === 412) {
                return [];
            }

        }

        if (!response) {

            throw new AssistentDetailedError(500, 'Error', 'Journal entries data is missing or in unexpected format');

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
            throw new AssistentDetailedError(500, 'Error', 'Journal ID not found in URL');
        }
        const journal = AssistentCache.getJournal(journalId)
        if (!journal) {
            throw new AssistentDetailedError(500, 'Error', 'Journal data not found in cache');
            return null;
        }

        return journal;
    }

    static async addLessonDiscrepanciesTable() {
        const journalHeaderElement = document.querySelector('.ois-form-layout-padding') as HTMLElement;

        if (!journalHeaderElement) {
            throw new AssistentDetailedError(500, 'Error', 'Journal header element not found');
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
                throw new AssistentDetailedError(500, 'Error', 'Journal table not found');
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

        const gradingType = journal.gradingType;
        const isNumeric = gradingType === "numeric";
        const missingGradesTable = AssistentDom.createStructure(`
            <div id="assistent-grades-table-container">
                <table id="assistent-grades-table" class="assistent-table">
                    <caption>Puuduvad hinded</caption>
                    <thead>
                        <tr>
                            <th>Õpiväljund</th>
                            <th>Hindeta õpilased</th>
                            <th>Tegevus</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${journal.missingGrades.map(({name, studentList}) => `
                            <tr>
                                <td class="align-left">${name}</td>
                                <td class="align-left">${studentList.map(({name}) => name).join(', ')}</td>
                                <td><button class="md-raised md-button md-ink-ripple md-accent">${studentList.length > 1 ? 'Lisa hindeid' : 'Lisa hinne'}</button></td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" class="align-left">
                                <input type="radio" id="passFail" name="grading" value="Mitteeristav hindamine" ${!isNumeric ? 'checked' : ''}>
                                <label for="passFail">Mitteeristav hindamine${!isNumeric ? ' (vaikimisi)' : ''}</label>
                                <br>
                                <input type="radio" id="numeric" name="grading" value="Eristav hindamine" ${isNumeric ? 'checked' : ''}>
                                <label for="numeric">Eristav hindamine${isNumeric ? ' (vaikimisi)' : ''}</label>
                                <br>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>`);


        journalHeaderElement.before(missingGradesTable);

        document.querySelectorAll('#assistent-grades-table button.md-accent').forEach((button, index) => {
            button.addEventListener('click', async () => {

                TahvelJournal.setGradeInputAsSelectToFalse();
                // Click on "Sisestusväljana" radio button to enable grade input as text
                const gradingType = document.querySelector('input[name="grading"]:checked').id;

                // Find the ↻ icon for the selected learning outcome grade and click it to open the grade input dialog
                TahvelJournal.clickQuickUpdate(`${journal.missingGrades[index].code}`);

                // Iterate over all students who are missing a grade of the current outcome
                for (const student of journal.missingGrades[index].studentList) {
                    // Calculate the student's grade based on the grading type and existing grades
                    const grade = TahvelJournal.calculateGrade(gradingType);

                    console.log("student", student);
                    // Set the grade for the current student
                    TahvelJournal.setGradeForStudent(student.studentId, grade);

                    // Set the date of the grade for the current student
                    TahvelJournal.setDateForStudentGrade(student.studentId, new Date());

                    // If the grade was negative input a comment for the grade explaining the reason for the negative grade
                    if (grade < 0 || grade === "MA") {
                        TahvelJournal.setCommentForStudentGrade(student.studentId, "Grade was negative due to...");
                    }
                }

                // Click on the green checkmark to save the grades for this outcome
                TahvelJournal.saveGradesForOutcome(journal.missingGrades[index].code);
            });
        });
    }

    // Function to calculate grade
    static calculateGrade(gradingType: string) {
        let grade;
        if (gradingType === 'numeric') {
            grade = '3';
        } else {
            grade = 'MA';
        }
        return grade;
    }

    static setGradeForStudent(id: any, grade: any) {
        // find tr where a href contains student id
        const tr = Array.from(document.querySelectorAll('tr')).find(tr => {
            const a = tr.querySelector('a');
            if (!a) return false;
            return a.getAttribute('href').includes(id);
        });

        console.log("Student's TR: ", tr);

        const gradeInput = document.querySelector('input[aria-label="grade"]') as HTMLInputElement;
        gradeInput.value = grade;
        const inputEvent = new Event('input', {bubbles: true});
        gradeInput.dispatchEvent(inputEvent);
    }

    static setDateForStudentGrade(studentId: number, date: Date) {
        const dateInput = document.querySelector('input[aria-label="grade date"]') as HTMLInputElement;
        dateInput.value = DateTime.fromJSDate(date).toFormat('dd.LL.yyyy');
        const inputEvent = new Event('input', {bubbles: true});
        dateInput.dispatchEvent(inputEvent);
    }

    static setCommentForStudentGrade(studentId: number, gradeWasNegativeDueTo: string) {
        const commentInput = document.querySelector('input[ng-model="journalEntry.quickUpdateStudents[row.studentId].addInfo"]') as HTMLTextAreaElement;
        commentInput.value = gradeWasNegativeDueTo;
        const inputEvent = new Event('input', {bubbles: true});
        commentInput.dispatchEvent(inputEvent);
    }

    static saveGradesForOutcome(code: string) {
        const saveButton = document.querySelector('button[ng-click="saveQuickOutcomeUpdate(journalEntry)"]') as HTMLElement;
        saveButton.click();
    }


    // Function to find elements by exact text content
    static clickQuickUpdate(learningOutcome) {
        // TODO: add english language support
        const spans = Array.from(document.querySelectorAll('span')).filter(el => el.innerHTML.trim() === 'ÕV' + learningOutcome);
        if (spans.length !== 1) {
            throw new AssistentDetailedError(500, 'Error', 'Could not find the learning outcome');
        }
        const thElement = spans[0]?.closest('th'); // Get the parent <th> element
        if (!thElement) {
            throw new AssistentDetailedError(500, 'Error', 'Could not find the parent <th> element');
        }

        const mdIconElement = thElement.querySelector('md-icon') as HTMLElement; // Find the md-icon element
        if (!mdIconElement) {
            throw new AssistentDetailedError(500, 'Error', 'Could not find the md-icon element');
        }
        console.log(mdIconElement);
        // click the md-icon element
        mdIconElement.click();
    }


    static getLearningOutcomesArray(): AssistentLearningOutcomes[] {
        const learningOutcomes = Array.from(document.querySelectorAll('div[ng-if="journal.includesOutcomes"] tbody tr')).map(tr => ({
            name: tr.querySelector('td:nth-child(4)')!.textContent!,
            code: tr.querySelector('td:nth-child(3)')!.textContent!,
        }));
        if (learningOutcomes.length === 0) return learningOutcomes;
        TahvelJournal.removeGroupNameIfAllOutcomesAreForTheSameGroup(learningOutcomes);
        return learningOutcomes;
    }

    private static removeGroupNameIfAllOutcomesAreForTheSameGroup(outcomes: AssistentLearningOutcomes[]) {

        const getGroupName = (name: string) => (name.match(/\(([^)]+)\)/g) || []).slice(-1)[0]?.slice(1, -1) || '';
        const firstGroupName = getGroupName(outcomes[0].name);
        if (outcomes.every(({name}) => getGroupName(name) === firstGroupName)) {
            outcomes.forEach(outcome => outcome.name = outcome.name.replace(/\s*\([^)]*\)\s*$/, '').trim());
        }
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
        await TahvelDom.fillTextbox('input[name="lessons"]', timetableLessons.toString());

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
            throw new AssistentDetailedError(500, 'Element not found', 'Checkbox element not found.');
        }

        // Simulate a click on the checkbox
        checkbox.click();


        // Make checkbox border 2px green
        checkbox.style.border = '2px solid #40ff6d';


    }

    static async setJournalEntryTypeAsLesson(): Promise<void> {
        await TahvelDom.selectDropdownOption("journalEntry.entryType", "SISSEKANNE_T");
    }

    static async setJournalEntryDate(discrepancy: AssistentJournalDifference): Promise<void> {

        // Find the input element with the specified class
        const datepickerInput = await AssistentDom.waitForElement('.md-datepicker-input') as HTMLInputElement;

        if (!datepickerInput) {
            throw new AssistentDetailedError(500, 'Element not found', 'Datepicker input field not found.');
        }

        // Extract only the date portion from the provided date string
        const date = new Date(discrepancy.date);
        const formattedDate = DateTime.fromJSDate(date).toFormat('dd.LL.yyyy');

        if (!datepickerInput) {
            throw new AssistentDetailedError(500, 'Element not found', 'Datepicker input field not found.');
        }

        // Set the value for the datepicker input
        datepickerInput.value = formattedDate;

        // Dispatch an input event to notify AngularJS of the input value change
        const inputEvent = new Event('input', {bubbles: true});
        datepickerInput.dispatchEvent(inputEvent);

        // Make the datepicker input border green
        datepickerInput.style.border = '2px solid #40ff6d';

    }

    static async fetchLearningOutcomes(journalId: number): Promise<{
        entryType: string;
        studentOutcomeResults: { studentId: number }[];
        code: number;
        curriculumModuleOutcomes: number;
        journalId: number;
        name: string
    }[]> {
        let response: apiCurriculumModuleEntry[];
        try {
            response = await Api.get(`/journals/${journalId}/journalEntriesByDate`);
        } catch (e) {
            if (e.statusCode === 412) {
                return [];
            }
        }

        if (!response) {
            throw new AssistentDetailedError(500, 'Error', 'Journal entries data is missing or in unexpected format');
        }

        return response
            .filter(entry => entry.entryType === 'SISSEKANNE_O' || entry.entryType === 'SISSEKANNE_L')
            .map(entry => ({
                journalId: journalId,
                name: entry.nameEt,
                code: entry.outcomeOrderNr + 1,
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
        const journalEntryElement: HTMLElement = await TahvelJournal.findJournalEntryElement(discrepancy);

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
                throw new AssistentDetailedError(500, 'Element not found', 'Add new entry button not found.');
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

    private static async findJournalGradeElement(nameEt: string) {
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

    // Function to find and click the radio button
    static setGradeInputAsSelectToFalse() {
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
            // Set the value for the date input
            dateInput.value = today.getDate().toString().padStart(2, '0') + '.' +
                (today.getMonth() + 1).toString().padStart(2, '0') + '.' +
                today.getFullYear();
            // Dispatch an input event to notify AngularJS of the input value change
            const dateInputEvent = new Event('input', {bubbles: true});
            dateInput.dispatchEvent(dateInputEvent);
            // Make the date input border green
            dateInput.style.border = '2px solid #40ff6d';
        });
    }
}

export default TahvelJournal;
