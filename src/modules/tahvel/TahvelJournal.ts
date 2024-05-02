import Api from "~src/shared/AssistentApiClient";
import {type AssistentJournalEntry, LessonType} from "~src/shared/AssistentTypes";
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
            const alertsContainer = TahvelDom.createAlertContainer();

            const headerRow = TahvelDom.createAlertListHeader();
            headerRow.appendChild(TahvelDom.createDateHeader());
            headerRow.appendChild(TahvelDom.createMessageHeader());

            alertsContainer.appendChild(headerRow);
            journalHeaderElement.appendChild(alertsContainer);


            // Iterate over the discrepancies and create an alert with the appropriate action button
            for (const discrepancy of sortedDiscrepancies) {
                const alertElement = TahvelDom.createAlert();

                // Add an action button based on the discrepancy type
                if (discrepancy.timetableLessonCount > 0 && discrepancy.journalLessonCount === 0) {

                    // Add the date of the discrepancy
                alertElement.appendChild(TahvelDom.createAlertDate(DateTime.fromISO(discrepancy.date).toFormat('dd.LL.yyyy')));

                    // Create a message for the discrepancy
                const journalMessage = TahvelJournal.createMessage(discrepancy, 'journal');
                alertElement.appendChild(TahvelDom.createMessageElement(`<table><tr><td>Tunniplaanis:</td><td>${(TahvelJournal.createMessage(discrepancy, 'timetable'))}</td></tr><tr><td>Päevikus:</td><td>${journalMessage}</td></tr></table>`));

                }
                alertsContainer.appendChild(alertElement);
            }

            journalHeaderElement.appendChild(alertsContainer);
        }

        // Mark that alerts have been injected
        journalHeaderElement.setAttribute('data-alerts-injected', 'true');
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
}

export default TahvelJournal;
