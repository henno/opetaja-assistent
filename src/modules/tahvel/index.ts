import AssistentCache from "~src/shared/AssistentCache";
import Api from "~src/shared/AssistentApiClient";
import TahvelLessonTimes from './TahvelLessonTimes.json';
import TahvelStudyYear from "./TahvelStudyYear";
import TahvelTimetable from "~src/modules/tahvel/TahvelTimetable";
import TahvelJournal from "~src/modules/tahvel/TahvelJournal";
import TahvelJournalList from "~src/modules/tahvel/TahvelJournalList";
import TahvelUser from "~src/modules/tahvel/TahvelUser";
import AssistentDom from "~src/shared/AssistentDom";
import TahvelStudents from "~src/modules/tahvel/TahvelStudents";
import {type apiJournalInfoEntry} from "~src/modules/tahvel/TahvelTypes";

const urlJournalsList = '/#/journals(\\?_menu)?';
const urlJournalEdit = '#/journal/\\d+/edit';
const elementJournalList = `#main-content > div.layout-padding > div > md-table-container > table > tbody > tr > td:nth-child(2) > a`;
const elementJournalEdit = `#journalEntriesByDate`;

class Tahvel {

    // Define actions array
    static actions = [
        {
            description: 'Inject yellow warning triangles to journal list when there are discrepancies between timetable and journal',
            urlFragment: new RegExp(urlJournalsList),
            elementToWaitFor: elementJournalList,
            action: TahvelJournalList.injectAlerts
        },
        {
            description: 'Inject alerts to journal pages when there are discrepancies between timetable and journal',
            urlFragment: new RegExp(urlJournalEdit),
            elementToWaitFor: elementJournalEdit,
            action: TahvelJournal.injectAlerts
        },
        {
            description: 'Inject alerts to journal pages when there are missing grades',
            urlFragment: new RegExp(urlJournalEdit),
            elementToWaitFor: elementJournalEdit,
            action: TahvelJournal.injectMissingGradesAlerts
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

        // Find all action configs based on the URL
        const actionConfigs = Tahvel.actions.filter(config => config.urlFragment.test(currentUrl));

        for (const actionConfig of actionConfigs) {
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
                        differencesToTimetable: [],
                        students: [],
                        learningOutcomes: [],
                        missingGrades: [],
                        contactLessonsPlanned: null,
                        independentWorkPlanned: null,
                        contactLessonsGiven: null,
                        independentWorkGiven: null,
                        gradingType: null
                    });
                }

                // Find the journal and add the entry to it
                AssistentCache.getJournal(entry.journalId).entriesInTimetable.push(entry);
            }

            // Iterate over the journals and fill entriesInJournal
            for (const journal of AssistentCache.journals) {
                // Add journal entries to the journal object
                journal.entriesInJournal = await TahvelJournal.fetchEntries(journal.id);
                journal.students = await TahvelStudents.fetchEntries(journal.id);
                journal.learningOutcomes = await TahvelJournal.fetchLearningOutcomes(journal.id);
                try {
                    const response: apiJournalInfoEntry = await Api.get(`/journals/${journal.id}`);

                    if (!response) {
                        console.error("Error: Journal entries data is missing or in unexpected format");
                        return;
                    }

                    journal.contactLessonsPlanned = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_a")?.plannedHours || 0;
                    journal.independentWorkPlanned = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_i")?.plannedHours || 0;
                    journal.contactLessonsGiven = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_a")?.usedHours || 0;
                    journal.independentWorkGiven = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_i")?.usedHours || 0;
                    journal.gradingType = response.assessment;
                } catch (error) {
                    console.error("Error fetching journal info:", error);
                    throw error; // Rethrow error for upper layers to handle
                }

                // Find discrepancies for this journal
                AssistentCache.findJournalDiscrepancies(journal.id)
                AssistentCache.findCurriculumModuleOutcomeDiscrepancies(journal.id)
            }
        } catch (error) {
            console.error('Error in Tahvel.refreshCache:', error);
        }
    }

}

export default Tahvel;
