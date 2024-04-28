import {AssistentCache} from '~src/shared/AssistentCache';

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

                const discrepancies = journal.differencesToTimetable.length > 0;
                if (discrepancies) {
                    const wrapper = document.createElement('span');
                    wrapper.style.display = 'flex';

                    const exclamationMark = document.createElement('span');
                    exclamationMark.style.color = 'red';
                    // exclamationMark.innerHTML = `ℹ️`;
                    exclamationMark.innerHTML = `⚠️`;
                    exclamationMark.style.paddingLeft = '5px';
                    // exclamationMark.style.fontSize = '1.3em';

                    wrapper.appendChild(link.cloneNode(true));
                    wrapper.appendChild(exclamationMark);

                    link.replaceWith(wrapper);
                }

            });

        } catch (error) {
            console.error('Error in TahvelJournalList.injectAlerts:', error);
        }
    }

}

export default TahvelJournalList;

