import {AssistentCache} from '~src/shared/AssistentCache';
import TahvelDom from "~src/modules/tahvel/TahvelDom";

class TahvelJournalList {
    static injectAlerts() {

        try {
            const journalsListTableRowsSelector = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
            const journalLinksSelector = `${journalsListTableRowsSelector} > td:nth-child(2) > a`

            const journalLinks = document.querySelectorAll(journalLinksSelector);

            journalLinks.forEach(async (link) => {
                const href = link.getAttribute('href');

                const journalId = parseInt(href.split('/')[3]);

                const journal = AssistentCache.getJournal(journalId);

                const discrepancies = journal.differencesToTimetable;
                // console.log('Discrepancies:', discrepancies);

                discrepancies.forEach((difference) => {
                    // console.log('Journal:', journal)
                    console.log('Difference:', difference);
                    const wrapper = document.createElement('span');
                    // wrapper.style.display = 'flex';
                    wrapper.id = 'InjectionsWrapper';

                    wrapper.appendChild(link.cloneNode(true));

                    // If there are lessons in timetable that are not in journal
                    if (difference.timetableLessonCount > 0 && difference.journalLessonCount === 0) {
                        // console.log('Missing lessons in journal:', journal);
                        const exclamationMark = TahvelDom.createExclamationMark('MissingLessonsAlert', 'yellow', '⚠️', 'Päevikus puuduvad sissekanded võrreldes tunniplaaniga');
                        wrapper.appendChild(exclamationMark);
                    }

                    // If there are lessons in journal that are not in timetable
                    if ((difference.timetableLessonCount > 0
                            && difference.journalLessonCount > 0
                            && (difference.timetableLessonCount !== difference.journalLessonCount || difference.timetableFirstLessonStartNumber !== difference.journalFirstLessonStartNumber))
                        || (difference.journalLessonCount > 0 && difference.timetableLessonCount === 0)) {
                        const exclamationMark = TahvelDom.createExclamationMark('DiscrepanciesAlert', 'grey', '\u26A0', 'Erinevused päeviku sissekannete ja tunniplaani vahel');
                        wrapper.appendChild(exclamationMark);
                    }

                    // If there are missing grades in journal
                    if (journal.missingGrades.length > 0 && journal.contactLessonsPlanned <= journal.entriesInTimetable.length) {
                        const exclamationMark = TahvelDom.createExclamationMark('MissingGradesAlert', 'red', '\u26A0', 'Päevikus puuduvad hinded');
                        wrapper.appendChild(exclamationMark);
                    }

                    link.replaceWith(wrapper);
                });
            });

        } catch (error) {
            console.error('Error in TahvelJournalList.injectAlerts:', error);
        }
    }
}

export default TahvelJournalList;

