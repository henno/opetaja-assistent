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

const urlForJournalsList = '/#/journals(\\?_menu)?';
const urlForJournalEdit = '#/journal/\\d+/edit';
const linksInJournalList = `#main-content > div.layout-padding > div > md-table-container > table > tbody > tr > td:nth-child(2) > a`;
const elementInJournalEdit = `#journalEntriesByDate > table > thead > tr > th:nth-child(1)`;

class Tahvel {

    // Define actions array
    static actions = [
        {
            description: 'Inject warning triangles to journal list when there are discrepancies or missing grades',
            urlFragment: new RegExp(urlForJournalsList),
            elementToWaitFor: linksInJournalList,
            action: TahvelJournalList.addWarningTriangles
        },
        {
            description: 'Inject a table to journal pages when there are discrepancies between timetable and journal',
            urlFragment: new RegExp(urlForJournalEdit),
            elementToWaitFor: elementInJournalEdit,
            action: TahvelJournal.addLessonDiscrepanciesTable
        },
        {
            description: 'Inject alerts to journal pages when there are missing grades',
            urlFragment: new RegExp(urlForJournalEdit),
            elementToWaitFor: elementInJournalEdit,
            action: TahvelJournal.addMissingGradesTable
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

            // Inject custom styles
            Tahvel.addCustomStyles();

            Tahvel.enhanceSPAHistoryNavigation();

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
                await AssistentDom.waitForElement(actionConfig.elementToWaitFor);

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
                        gradingType: null,
                        lessonMissing: false,
                        lessonDiscrepancies: false
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
                AssistentCache.findJournalLessonsDifferencesFact(journal.id)

            }
        } catch (error) {
            console.error('Error in Tahvel.refreshCache:', error);
        }
    }

    /** Injects additional styles for the extension to the DOM */
    private static addCustomStyles() {
        // Inject custom styles for the extension
        document.head.appendChild(AssistentDom.createStructure(`
            <style>
                .assistent-table {
                    border-collapse: collapse;
                    font-family: Roboto, "Helvetica Neue", sans-serif;
                    font-size: 12px;
                    vertical-align: middle;
                    text-align: center;
                    color: rgb(32 32 32);
                }
                
                .assistent-table caption {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 10px;
                    text-align: left;
                }
                
                .assistent-table th,
                .assistent-table td {
                    border: 1px solid #ccc;
                    padding: 10px;
                }
                
                .assistent-table th, .assistent-table td:first-child, #alertElementContainer tr:last-child  {
                    background-color: #FAFAFA;
                }
                
                .assistent-table tr:nth-child(even) {
                    background-color: #F5F5F5;
                }
                
                .assistent-table tr:nth-child(odd) {
                    background-color: #FCFCFC;
                }
                
                .assistent-table tr td:first-child {
                    max-width: 300px;
                }
                
                .assistent-table del {
                    background-color: #fcc;
                    padding: 0;
                    color: #910000;
                    margin-right:3px;
                }
                
                .assistent-table ins {
                    background-color: #cfc;
                    text-decoration: none;
                    padding: 0;
                    margin-left: 3px;
                }
                
                td.align-left {
                    text-align: left;
                }
                
                #assistent-grades-table-container {
                    margin-top: 20px; 
                    margin-left: 18px;
                }
            </style>`));
    }
}

export default Tahvel;
