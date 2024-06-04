import AssistentCache from "~src/shared/AssistentCache";
import Api from "~src/shared/AssistentApiClient";
import TahvelLessonTimes from './TahvelLessonTimes.json';
import TahvelStudyYear from "./TahvelStudyYear";
import TahvelTimetable from "~src/modules/tahvel/TahvelTimetable";
import TahvelJournal from "~src/modules/tahvel/TahvelJournal";
import TahvelJournalList from "~src/modules/tahvel/TahvelJournalList";
import TahvelJournalEntryDialog from "~src/modules/tahvel/TahvelJournalEntryDialog";
import TahvelUser from "~src/modules/tahvel/TahvelUser";
import AssistentDom from "~src/shared/AssistentDom";
import TahvelStudents from "~src/modules/tahvel/TahvelStudents";
import {apiAssessmentEntry, type apiJournalInfoEntry} from "~src/modules/tahvel/TahvelTypes";
import {AssistentGradingType} from "~src/shared/AssistentTypes";
import {AssistentDetailedError} from "~src/shared/AssistentDetailedError";
import {AssistentApiError} from "~src/shared/AssistentApiError";

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

        // Inject custom styles
        Tahvel.addCustomStyles();

        // Initialize customizations (try-catch doesn't work with promises, so we need to catch errors explicitly)
        TahvelJournalEntryDialog.initCustomizations().catch(error => Tahvel.handleError(error));

        // Set the base URL for the API
        Api.url = Api.extractBaseUrl() + "hois_back";

        // Fetch data
        await TahvelUser.init();

        // Check if the user is logged in
        if (!TahvelUser.schoolId) {
            return;
        }

        await TahvelStudyYear.init();
        AssistentCache.lessonTimes = TahvelLessonTimes[TahvelUser.schoolId];

        // Fill the cache with data
        await Tahvel.refreshCache();

        Tahvel.enhanceSPAHistoryNavigation();

    }

    static handleError(error: Error): void {
        console.error(error)

        if(error instanceof AssistentApiError) {
            AssistentDom.showErrorMessage('HTTP päring veebiteenusele lõppes õnnetult:', error.message, error.statusCode);
            return;
        }
        if (error instanceof AssistentDetailedError) {
            AssistentDom.showErrorMessage(error.title, error.message, error.code);
        } else {
            AssistentDom.showErrorMessage('Error', error.message, 500);
        }
    }

    /** Replaces the default history navigation with a custom one to execute actions based on the URL */
    private static enhanceSPAHistoryNavigation() {

        try {
            const originalPushState = history.pushState;

            // Do stuff when the user navigates to a new page
            history.pushState = function (...args) {
                originalPushState.apply(this, args);
                Tahvel.executeActionsBasedOnURL().catch(error => Tahvel.handleError(error));
            };

            // Do stuff when the user navigates back
            window.addEventListener('popstate', () => {
                Tahvel.executeActionsBasedOnURL().catch(error => Tahvel.handleError(error));
            });

            // Execute actions based on the initial URL
            Tahvel.executeActionsBasedOnURL().catch(error => Tahvel.handleError(error));

        } catch (error) {
            Tahvel.handleError(error)
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
            Tahvel.handleError(error)
        }
    }

    /** Fetches the timetable entries and fills the cache with them */
    private static async refreshCache() {

        // Fetch the timetable events
        const timetableEntries = await TahvelTimetable.fetchEntries();

        // Iterate over the events and add them to the cache
        for (const entry of timetableEntries) {

            // Create new journal if it doesn't exist
            if (!AssistentCache.getJournal(entry.journalId)) {

                // Create a new journal object and add it to the cache
                AssistentCache.journals.push({
                    id: entry.journalId,
                    name: entry.name,
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

            let response: apiJournalInfoEntry;
            try {
                response = await Api.get(`/journals/${journal.id}`);
            } catch (e) {
                if (e.statusCode === 412) {
                    continue;
                }
            }

            if (!response) {
                throw new AssistentDetailedError(500, 'Error', 'Journal entries data is missing or in unexpected format');
            }

            journal.contactLessonsPlanned = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_a")?.plannedHours || 0;
            journal.independentWorkPlanned = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_i")?.plannedHours || 0;
            journal.contactLessonsGiven = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_a")?.usedHours || 0;
            journal.independentWorkGiven = response.lessonHours.capacityHours.find(capacity => capacity.capacity === "MAHT_i")?.usedHours || 0;
            journal.gradingType = response.assessment === apiAssessmentEntry.numeric ? AssistentGradingType.numeric : AssistentGradingType.passFail;

            // Find discrepancies for this journal
            AssistentCache.findJournalDiscrepancies(journal.id)
            AssistentCache.findCurriculumModuleOutcomeDiscrepancies(journal.id)
            AssistentCache.findJournalLessonsDifferencesFact(journal.id)

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

                #assistent-learning-outcomes-dropdown {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background-color: transparent;
                    font-size: 13px;
                    color: #333;
                }
                
                #assistent-learning-outcomes-dropdown > div.ss-main {
                    font-size: 13px;
                    color: red !important;
                    background-color: #f5f5f5;
                    min-height: 50px;
                    border: 0;
                    border-bottom: 1px solid #d7d7d7;
                    border-radius: 0;
                }
                
                .ss-content .ss-list .ss-option {
                    font-size: 13px;                
                }
                

                #assistent-learning-outcomes-dropdown > div.ss-main > div.ss-values > div.ss-placeholder {
                    font-size: 13px;
                    color: rgba(255, 64, 129, 0.87);
                }
                
                #assistent-learning-outcomes-dropdown > div.ss-main > div.ss-values > div.ss-value {
                    padding: 5px;
                    margin: 0;
                    background-color: rgba(255, 64, 129, 0.87);
                }
                
                .assistent-message-box {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: white;
                    padding: 0;
                    
                    z-index: 1000;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    border-radius: 5px;
                    min-width: 300px;
                    border: 1px solid red;
                    
                }
                
                .assistent-message-box-title {
                    font-weight: bold;
                    font-size: 18px;
                    margin-bottom: 10px;
                    color: white;
                    background-color: red;
                    padding: 10px;
                }
                
                
                .assistent-message-box-message {
                    margin-bottom: 10px;
                    padding: 10px;
                    padding-bottom: 40px;
                }
                
                .assistent-message-box-close-button {
                    background-color: #f5f5f5;
                    border: 1px solid #ccc;
                    padding: 5px 10px;
                    cursor: pointer;
                    right: 10px;
                    position: absolute;
                    bottom: 10px;
                }
                
                .assistent-message-box-close-button:hover {
                    background-color: #e5e5e5;
                }
                
                .assistent-message-box-close-button:active {
                    background-color: #d5d5d5;
                }
                
                .assistent-message-box-close-button:focus {
                    outline: none;
                }
                
            </style>`));
    }
}

export default Tahvel;
