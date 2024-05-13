import {AssistentCache} from '~src/shared/AssistentCache';
import TahvelDom from "~src/modules/tahvel/TahvelDom";

class TahvelJournalList {
    static addWarningTriangles() {

        try {
            const journalsListTableRowsSelector = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
            const journalLinksSelector = `${journalsListTableRowsSelector} > td:nth-child(2) > a`

            const journalLinks = document.querySelectorAll(journalLinksSelector);

            journalLinks.forEach(async (link) => {
                const href = link.getAttribute('href');

                const journalId = parseInt(href.split('/')[3]);

                const journal = AssistentCache.getJournal(journalId);

                const wrapper = document.createElement('span');
                wrapper.style.display = 'flex';
                wrapper.id = 'InjectionsWrapper';

                wrapper.appendChild(link.cloneNode(true));

                // If there are lessons in timetable that are not in journal
                if (journal.lessonMissing) {
                    // console.log('Missing lessons in journal:', journal);
                    const exclamationMark = TahvelDom.createExclamationMark('MissingLessonsAlert', '#f8d00f', '\u26A0', 'Päevikus puuduvad sissekanded võrreldes tunniplaaniga');
                    wrapper.appendChild(exclamationMark);
                }

                // If there are lessons in journal that are not in timetable
                if (journal.lessonDiscrepancies) {
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

        } catch (error) {
            console.error('Error in TahvelJournalList.addWarningTriangles:', error);
        }
    }
}

export default TahvelJournalList;

