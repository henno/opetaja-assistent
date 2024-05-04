import {AssistentCache} from '~src/shared/AssistentCache';

class TahvelJournalList {
    static injectMissingLessonsAlerts() {

        try {
            const journalsListTableRowsSelector = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
            const journalLinksSelector = `${journalsListTableRowsSelector} > td:nth-child(2) > a`

            const journalLinks = document.querySelectorAll(journalLinksSelector);

            journalLinks.forEach(async (link) => {
                const href = link.getAttribute('href');

                const journalId = parseInt(href.split('/')[3]);

                const journal = AssistentCache.getJournal(journalId);

                const discrepancies = journal.differencesToTimetable;

                discrepancies.forEach((difference) => {
                    if (difference.timetableLessonCount > 0 && difference.journalLessonCount === 0) {
                        const wrapper = document.createElement('span');
                        wrapper.style.display = 'flex';

                        const exclamationMark = document.createElement('span');
                        //exclamationMark.style.color = 'yellow';
                        // exclamationMark.innerHTML = `ℹ️`;
                        exclamationMark.style.fontWeight = 'bold';
                        exclamationMark.innerHTML = `⚠️`;
                        exclamationMark.style.paddingLeft = '5px';
                        //exclamationMark.style.fontSize = '1.3em';
                        exclamationMark.title = 'Päevikus puuduvad sissekanded võrreldes tunniplaaniga'; // Tooltip text

                        wrapper.appendChild(link.cloneNode(true));
                        wrapper.appendChild(exclamationMark);

                        link.replaceWith(wrapper);
                    }
                });
            });

        } catch (error) {
            console.error('Error in TahvelJournalList.injectAlerts:', error);
        }
    }

    static injectLessonsDiscrapencesAlerts() {

        try {
            const journalsListTableRowsSelector = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
            const journalLinksSelector = `${journalsListTableRowsSelector} > td:nth-child(2) > a`

            const journalLinks = document.querySelectorAll(journalLinksSelector);

            journalLinks.forEach(async (link) => {
                const href = link.getAttribute('href');

                const journalId = parseInt(href.split('/')[3]);

                const journal = AssistentCache.getJournal(journalId);

                const discrepancies = journal.differencesToTimetable;

                discrepancies.forEach((difference) => {
                    if ((difference.timetableLessonCount > 0
                        && difference.journalLessonCount > 0
                        && (difference.timetableLessonCount !== difference.journalLessonCount || difference.timetableFirstLessonStartNumber !== difference.journalFirstLessonStartNumber))
                    || (difference.journalLessonCount > 0 && difference.timetableLessonCount === 0)){
                        const wrapper = document.createElement('span');
                        wrapper.style.display = 'flex';

                        const exclamationMark = document.createElement('span');
                        exclamationMark.style.color = 'grey';
                        // exclamationMark.innerHTML = `ℹ️`;
                        exclamationMark.style.fontWeight = 'bold';
                        exclamationMark.innerHTML = `\u26A0`; // Unicode for ⚠️
                        exclamationMark.style.paddingLeft = '5px';
                        //exclamationMark.style.fontSize = '1.3em';
                        exclamationMark.title = 'Erinevused päeviku sissekannete ja tunniplaani vahel';

                        wrapper.appendChild(link.cloneNode(true));
                        wrapper.appendChild(exclamationMark);

                        link.replaceWith(wrapper);
                    }
                });
            });

        } catch (error) {
            console.error('Error in TahvelJournalList.injectAlerts:', error);
        }
    }

    static injectMissingGradesAlerts() {
        try {
            const journalsListTableRowsSelector = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
            const journalLinksSelector = `${journalsListTableRowsSelector} > td:nth-child(2) > a`

            const journalLinks = document.querySelectorAll(journalLinksSelector);

            journalLinks.forEach(async (link) => {
                const href = link.getAttribute('href');

                const journalId = parseInt(href.split('/')[3]);

                const journal = AssistentCache.getJournal(journalId);

                if (journal.missingGrades.length > 0 && journal.contactLessonsPlanned <= journal.entriesInTimetable.length) {
                    const wrapper = document.createElement('span');
                    wrapper.style.display = 'flex';

                    const exclamationMark = document.createElement('span');
                    exclamationMark.style.color = 'red';
                    // exclamationMark.innerHTML = `ℹ️`;
                    exclamationMark.style.fontWeight = 'bold';
                    exclamationMark.innerHTML = `\u26A0`; // Unicode for ⚠️
                    exclamationMark.style.paddingLeft = '5px';
                    exclamationMark.style.fontSize = '1.3em';
                    exclamationMark.title = 'Päevikus puuduvad hinded';

                    wrapper.appendChild(link.cloneNode(true));
                    wrapper.appendChild(exclamationMark);

                    link.replaceWith(wrapper);
                }
            });
        } catch (error) {
            console.error('Error in TahvelJournalList.injectMissingGradesAlerts:', error);
        }
    }

}

export default TahvelJournalList;

