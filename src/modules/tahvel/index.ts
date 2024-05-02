// Tahvel.ts
import AssistentCache from "~src/shared/AssistentCache";
import Api from "~src/shared/AssistentApiClient";
import TahvelLessonTimes from './TahvelLessonTimes.json';
import TahvelStudyYear from "./TahvelStudyYear";
import TahvelTimetable from "~src/modules/tahvel/TahvelTimetable";
import TahvelJournal from "~src/modules/tahvel/TahvelJournal";
import TahvelJournalList from "~src/modules/tahvel/TahvelJournalList";
import TahvelUser from "~src/modules/tahvel/TahvelUser";
import AssistentDom from "~src/shared/AssistentDom";

class Tahvel {

    // Define actions array
    static actions = [
        {
            description: 'Inject yellow warning triangles to journal list when there are discrepancies between timetable and journal',
            urlFragment: new RegExp('/#/journals(\\?_menu)?'),
            elementToWaitFor: `#main-content > div.layout-padding > div > md-table-container > table > tbody > tr > td:nth-child(2) > a`, // <a> tags in journal list
            action: TahvelJournalList.injectAlerts
        },
        {
            description: 'Inject alerts to journal pages when there are discrepancies between timetable and journal',
            urlFragment: new RegExp('#/journal/\\d+/edit'),
            elementToWaitFor: `#journalEntriesByDate`, // The header of the journal page
            action: TahvelJournal.injectAlerts
        }
    ];

    /** Sets up API URL, fetches data, fills the cache with data, and enhances SPA navigation */
    static async init(): Promise<void> {

        try {
            // Set the base URL for the API
            Api.url = Api.extractBaseUrl() + "hois_back";

            // Fetch data
            await TahvelUser.init();
            await TahvelStudyYear.init();
            AssistentCache.lessonTimes = TahvelLessonTimes[TahvelUser.schoolId];

            // Fill the cache with data
            await Tahvel.refreshCache();

            Tahvel.enhanceSPAHistoryNavigation();
            // Check missing entries
        } catch (error) {
            console.error('Error in Tahvel.init:', error);
        }

    }

    /** Replaces the default history navigation with a custom one to execute actions based on the URL */
    private static enhanceSPAHistoryNavigation() {

        try {
            const originalPushState = history.pushState;

            // Do stuff when the user navigates to a new page
            history.pushState = function (...args) {
                originalPushState.apply(this, args);
                Tahvel.executeActionsBasedOnURL()
            };

            // Do stuff when the user navigates back
            window.addEventListener('popstate', () => {
                Tahvel.executeActionsBasedOnURL();
            });

            // Execute actions based on the initial URL
            Tahvel.executeActionsBasedOnURL();


        } catch (error) {
            console.error('Error in Tahvel.enhanceSPAHistoryNavigation:', error);
        }
    }

    /** Injects the components to the DOM when the user navigates to a new location */
    private static async executeActionsBasedOnURL() {

        try {

            // Get the current URL
            const currentUrl = window.location.href;

            // Find the action config based on the URL
            const actionConfig = Tahvel.actions.find(config => config.urlFragment.test(currentUrl));

            if (actionConfig) {

                // Wait for the target element to be visible
                await AssistentDom.waitForElementToBeVisible(actionConfig.elementToWaitFor);

                // Execute the action
                actionConfig.action();
            }
        } catch (error) {
            console.error('Error in Tahvel.executeActionsBasedOnURL:', error);
        }
    }

    /** Fetches the timetable entries and fills the cache with them */
    private static async refreshCache() {

        try {
            // Fetch the timetable events
            const timetableEntries = await TahvelTimetable.fetchEntries();

            // Iterate over the events and add them to the cache
            for (const entry of timetableEntries) {

                // Create new journal if it doesn't exist
                if (!AssistentCache.getJournal(entry.journalId)) {

                    // Create a new journal object and add it to the cache
                    AssistentCache.journals.push({
                        id: entry.journalId,
                        nameEt: entry.name,
                        entriesInJournal: [],
                        entriesInTimetable: [],
                        differencesToTimetable: []
                    });
                }

                // Find the journal and add the entry to it
                AssistentCache.getJournal(entry.journalId).entriesInTimetable.push(entry);
            }

            // Iterate over the journals and fill entriesInJournal
            for (const journal of AssistentCache.journals) {

                // Add journal entries to the journal object
                journal.entriesInJournal = await TahvelJournal.fetchEntries(journal.id);

                // Find discrepancies for this journal
                AssistentCache.findJournalDiscrepancies(journal.id)
            }
        } catch (error) {
            console.error('Error in Tahvel.refreshCache:', error);
        }
    }

}

export default Tahvel;
