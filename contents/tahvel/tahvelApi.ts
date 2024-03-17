/** TYPES **/
import { DetailedError } from '@utils/DetailedError';

/** DEPENDENCIES **/
import type { Journal, TimetableEventApiResponse, Difference } from './types';

/** Cache Data **/
import { cache, clearCache } from './cacheData';

/** VARIABLES **/
let timeoutId = null;
let journalsElements = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
let journalElement = '.ois-form-layout-padding';
// Extract base URL from example URLs
const baseUrl: string = extractBaseUrl();

// Define pageActionsConfig array
const pageActionsConfig = [
    {
        pageIndicator: ['#/journals', '#/journals?_menu'],
        selector: `${journalsElements} > td:nth-child(2) > a`,
        action: injectJournalPageComponents // Function to inject components on the journals page
    }
];

/** MAIN CODE **/
(async () => {
    try {
        // Call the main function wrapper
        mainFunctionWrapper();
    } catch (e) {
        // General error handler (all errors in app should be caught and handled only here, unless they are expected)
        console.error(e);

        // Show the error message to the user in a modal
        showMessage(e.message, e instanceof DetailedError ? e.title : 'Error');
    }
})();

async function mainFunctionWrapper() {
    try {
        // Main functionality code goes here
        setUpUrlChangeListener().then(r => console.log('URL change listener set up.'));
        const { schoolId, teacherId } = await getUserData()
        const { beginDate, endDate } = await fetchTimetableStudyYears(schoolId)
        await updateCacheWithTimetableEvents(schoolId, teacherId, beginDate, endDate)
        console.log("Cache updated with timetable events.", cache)

        // Call pageActions here and update pageActionsConfig
        pageActionsConfig.push({
            pageIndicator: pageActions(),
            selector: `${journalElement}`,
            action: injectJournalPageComponents2 // Function to inject components on the journals page
        });

        // Call injectJournalPageComponents directly to ensure it runs on page load/refresh
        injectJournalPageComponents();
        // Call injectJournalPageComponents2 directly to ensure it runs on page load/refresh
        injectJournalPageComponents2();
    } catch (e) {
        // Error handling code goes here
        console.error(e);
        showMessage(e.message, e instanceof DetailedError ? e.title : 'Error');
    }
}

/** FUNCTION DEFINITIONS **/

// Function to extract base URL
function extractBaseUrl(): string {
    const url = window.location.href;
    const hashIndex = url.indexOf('#');
    return url.substring(0, hashIndex !== -1 ? hashIndex : undefined);
}

// Function to create actions array based on cache.journals
function pageActions() {
    return cache.journals.map(journal => `#/journal/${journal.id}/edit`);
}

function showMessage(title: string, message: string) {
    // Get or create the modal element
    let modal = document.getElementById('errorModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'errorModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000'; // or higher if necessary
        document.body.appendChild(modal);
    }

    // Create and style the error message container
    const messageContainer = document.createElement('div');
    messageContainer.style.backgroundColor = 'white';
    messageContainer.style.padding = '20px';
    messageContainer.style.borderRadius = '8px';
    messageContainer.style.textAlign = 'center';
    modal.appendChild(messageContainer);

    // Create and style the title element
    const titleElement = document.createElement('h2');
    titleElement.style.font = 'bold 24px Arial, sans-serif';
    titleElement.textContent = title;
    messageContainer.appendChild(titleElement);

    // Create and style the message element
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);

    // Create and style the close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '10px';
    closeButton.style.marginTop = '20px';
    closeButton.style.backgroundColor = 'red';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    messageContainer.appendChild(closeButton);

    // Add event listener to the close button
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

}

async function request(method: string, endpoint: string, body: object | null = null) {
    let options = {
        method: method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }
    };
    if (body !== null) {
        options['body'] = JSON.stringify(body);
    }
    const response = await fetch(endpoint, options);

    let responseBody: string;
    let responseJson: any;

    try {

        // JSON parsing
        responseBody = await response.text();
        responseJson = JSON.parse(responseBody);

        // Handle JSON parsing errors
    } catch (e) {

        // Just empty response body
        if (!responseBody) {
            throw new DetailedError(
                response.status,
                `Error ${response.status}`,
                'The data received from the server was empty which means that something went wrong. We apologize for the inconvenience. Please try again later.'
            );
        }

        // Non-JSON response
        throw new DetailedError(
            response.status,
            `Error ${response.status}`,
            'The data received from the server was not in JSON format which means that something went wrong. We apologize for the inconvenience. Please try again later.'
        );

    }

    // Handle HTTP errors
    if (!response.ok) {

        // Check that the response body contains the expected fields
        if (!responseJson.title || !responseJson.message) {
            throw new DetailedError(
                response.status,
                `Error ${response.status}`,
                'The data received from the server did not contain the expected fields which means that something went wrong. We apologize for the inconvenience. Please try again later.'
            );
        }

        // Normal 4xx errors will reach here
        throw new DetailedError(
            response.status,
            `Error ${response.status}: ${responseJson.title}`,
            responseJson.message
        );

    }

    // Return the response body when the response is OK
    return responseJson

}

function get(endpoint: string) {
    return request('GET', endpoint);
}

function post(endpoint: string, body: object) {
    return request('POST', endpoint, body);
}

function injectJournalPageComponents() {
    // Logic for injecting journal-specific components
    console.log('Injecting journal-specific components...');

    // Get all elements matching the selector
    let elements = document.querySelectorAll(`${journalsElements}`);

    // Get the index of the last element in the NodeList
    let journalLastIndex = elements.length;

    const journalsByTeacher = [];

    // Loop through the elements from 1 to 4
    for (let i = 1; i <= journalLastIndex; i++) {
        // Construct the CSS selector to target the specific tr element
        const selector = `${journalsElements}:nth-child(${i}) > td:nth-child(2) > a`;

        // Query the element using the constructed selector
        const element = document.querySelector(selector) as HTMLAnchorElement;

        // console.log("Element:", element);

        // Check if element exists
        if (element) {
            // Extract href, hash and innerText and store in cache
            // const href = element.href;
            const hash = element.hash;
            console.log("Hash:", hash);

            // Extract journalId from the hash using regular expressions
            const matches = hash.match(/\/journal\/(\d+)\/edit/);
            const journalId = matches ? parseInt(matches[1]) : null;

            // const innerText = element.innerText;
            // console.log("JournalId:", journalId, "innerText:", innerText);

            // Find the journal object from the cache based on journalId
            const journal = cache.journals.find(journal => journal.id === journalId);

            // Check if the journal object is found
            if (journal) {
                journalsByTeacher.push(journal);
            } else {
                console.error('Journal not found in cache for journalId:', journalId);
            }

            // Check if journalId is in mismatchedJournalIds
            if (journal && journal.hasDiscrepancy) {
                console.log(`Journal ID ${journalId} has discrepancies.`);
                // You can add more actions here if needed
                const span = document.createElement('span');
                span.style.borderRadius = '4px';
                span.style.color = 'white';
                span.style.backgroundColor = 'red';
                span.style.padding = '4px';
                span.style.marginLeft = '5px';
                span.innerText = '!!!';

                // Insert the span element after the current element
                element.parentNode.insertBefore(span, element.nextSibling);
            } else {
                console.log(`Journal ID ${journalId} does not have any discrepancies.`);
            }
        }
    }

    // Output the cached data
    console.log("journalsByTeacher", journalsByTeacher);

    // countEntries(journalsByTeacher);
    console.log(document.querySelectorAll(`${journalsElements}:nth-child(${journalLastIndex}) > td:nth-child(2) > a`));

    // console.log("Mismatched Journal IDs:", mismatchedJournalIds);

}

function getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day < 10 ? '0' + day : day}.${month < 10 ? '0' + month : month}.${year}`;
}

function injectJournalPageComponents2(): void {
    const currentJournalId = getCurrentJournalIdFromEditPage();
    const journal = cache.journals.find(j => j.id === currentJournalId);
    const container = document.querySelector(`${journalElement}`);

    if (journal && container) {
        console.log("Current Journal ID:", currentJournalId);

        // Create a MutationObserver to detect when the container element is added to the DOM
        const observer = new MutationObserver(() => {
            const container = document.querySelector(`${journalElement}`);
            if (container) {
                console.log("Container found. Injecting discrepancies div...");
                const discrepanciesDiv = getJournalDiscrepancies(journal);
                if (discrepanciesDiv) {
                    container.appendChild(discrepanciesDiv);
                    // Disconnect the observer after injecting the div
                    observer.disconnect();
                }
            }
        });

        // Start observing changes to the body element and its descendants
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        console.error("Container not found on the webpage or journal not found in cache for journalId:", currentJournalId);
    }
}

function getJournalDiscrepancies(journal: Journal): HTMLElement | null {
    const discrepanciesDiv = document.createElement('div');
    const missingJournalEntries: { date: string, timetableLessons: number, journalLessons: number, startLessonNr: number }[] = [];
    const missingTimetableEntries: { id: number, date: string, timetableLessons: number, journalLessons: number, startLessonNr: number }[] = [];
    const mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, startLessonNr: number }[] = [];

    journal.differences.forEach(entry => {
        if (entry.missing_J) {
            const formattedDate = getFormattedDate(entry.date);
            const missingJournalEntry = {
                date: formattedDate,
                timetableLessons: entry.timetableCount,
                journalLessons: entry.lessonsInJournal,
                startLessonNr: entry.startLessonNr
            };
            missingJournalEntries.push(missingJournalEntry);
        }
        if (entry.missing_E) {
            const formattedDate = getFormattedDate(entry.date);
            const missingTimetableEntry = {
                date: formattedDate,
                timetableLessons: entry.timetableCount,
                journalLessons: entry.lessonsInJournal,
                startLessonNr: entry.startLessonNr,
                id: entry.id
            };
            missingTimetableEntries.push(missingTimetableEntry);
        }
        if (entry.mismatch) {
            const formattedDate = getFormattedDate(entry.date);
            const mismatchEntry = {
                date: formattedDate,
                timetableLessons: entry.timetableCount,
                journalLessons: entry.lessonsInJournal,
                startLessonNr: entry.startLessonNr
            };
            mismatchingLessons.push(mismatchEntry);
        }
    });

    if (missingJournalEntries.length > 0 || missingTimetableEntries.length > 0 || mismatchingLessons.length > 0) {

        // Add missing Journal entries to the discrepanciesDiv
        if (missingJournalEntries.length > 0) {
            const journalTitleDiv = document.createElement('div');
            journalTitleDiv.textContent = 'Sissekandmata tunnid (Journal):';
            journalTitleDiv.style.fontWeight = 'bold';
            journalTitleDiv.style.color = 'red';
            discrepanciesDiv.appendChild(journalTitleDiv);

            missingJournalEntries.forEach(date => {
                const entryDiv = document.createElement('div');
                // Inside the loop where you create entryDiv elements
                entryDiv.id = `entry_${date.date}`; // Assign an ID to the div element based on the date

                entryDiv.textContent = date.date; // Assign the 'date' property of the object to the 'textContent' property of 'entryDiv'
                entryDiv.style.color = 'red';

                // Create a button element for each entry
                const button = document.createElement('button');
                button.className = 'md-raised md-primary md-button md-ink-ripple';
                button.textContent = 'Lisa';

                // Add event listener to the dynamically created button
                button.addEventListener('click', async () => {
                    // Simulate a click event on the original button
                    const originalButton = document.querySelector('[ng-click="addNewEntry()"]') as HTMLButtonElement;
                    if (originalButton) {
                        originalButton.click();

                        // Call the prefillEntryType function and wait for it to complete
                        prefillEntryType();

                        // Call preselectJournalEntryCapacityTypes after prefillEntryType completes
                        new Promise(resolve => setTimeout(resolve, 100)); // Adjust the timeout as needed
                        preselectJournalEntryCapacityTypes();

                        // Call prefillDateField after prefillEntryType completes
                        new Promise(resolve => setTimeout(resolve, 100)); // Adjust the timeout as needed
                        prefillDateField(date.date); // Pass the desired date to prefill

                        // Call prefillStartLessonNr with the startLessonNr from the current entry
                        const startLessonNr = date.startLessonNr;
                        const timetableLessons = date.timetableLessons;
                        fillLessonsAndStartLessonNr(startLessonNr, timetableLessons);

                        // Complete form
                        new Promise(resolve => setTimeout(resolve, 100)); // Adjust the timeout as needed

                        // Call clickSaveButton() with a callback
                        clickSaveButton(async () => {
                            // This function will be executed after clickSaveButton() finishes
                            const { schoolId, teacherId } = await getUserData();
                            console.log("clickSaveButton() completed.");

                            // Clear the cache before adding new data
                            clearCache();

                            // Update the cache with new data
                            const { beginDate, endDate } = await fetchTimetableStudyYears(schoolId);
                            await updateCacheWithTimetableEvents(schoolId, teacherId, beginDate, endDate);
                            console.log("Cache updated with data after clickSaveButton().", cache);

                            // Remove the dynamically created div element from the page
                            const entryDivToRemove = document.getElementById(`entry_${date.date}`);
                            if (entryDivToRemove) {
                                entryDivToRemove.remove();
                                console.log("Dynamically created div element removed from the page.");
                            } else {
                                console.error("Dynamically created div element not found.");
                            }
                        });

                    }
                });

                // Append the button to the entry div
                entryDiv.appendChild(button);

                discrepanciesDiv.appendChild(entryDiv);
            });

        }

        // Add missing Timetable entries to the discrepanciesDiv
        if (missingTimetableEntries.length > 0) {
            const timetableTitleDiv = document.createElement('div');
            timetableTitleDiv.textContent = 'Vaste tunniplaanis puudub (Timetable):';
            timetableTitleDiv.style.fontWeight = 'bold';
            timetableTitleDiv.style.color = 'red';
            discrepanciesDiv.appendChild(timetableTitleDiv);

            for (const dateEntry of missingTimetableEntries) {
                const entryDiv = document.createElement('div');
                entryDiv.textContent = dateEntry.date;
                entryDiv.id = `entry_${dateEntry.date}`; // Assign an ID to the div element based on the date

                entryDiv.style.color = 'red';

                // Find the corresponding entry in the cache data
                const correspondingEntry = journal.entriesInTimetable.find(entry => entry.date === dateEntry.date);
                if (correspondingEntry) {
                    // Assign the id property based on the found entry's id
                    entryDiv.id = `entry_${correspondingEntry.id}`;
                    // Add id to the dateEntry object
                    dateEntry.id = correspondingEntry.id;
                }

                // Create a button element for each entry
                const button = document.createElement('button');
                button.className = 'md-raised md-button md-ink-ripple';
                button.textContent = 'Kustuta';

                // Add event listener to the dynamically created button
                button.addEventListener('click', async () => {
                    try {
                        // Simulate a click event on the original button
                        const originalButton = document.querySelector('[ng-click="editJournalEntry(row.id)"]');
                        if (originalButton instanceof HTMLElement) {
                            originalButton.click();

                            // After simulating click on the edit button, call deleteJournal
                            await deleteJournal();

                            const { schoolId, teacherId } = await getUserData();

                            // Clear the cache before adding new data
                            clearCache();

                            // Update the cache with new data
                            const { beginDate, endDate } = await fetchTimetableStudyYears(schoolId);
                            await updateCacheWithTimetableEvents(schoolId, teacherId, beginDate, endDate);
                            console.log("Cache updated with data after clickSaveButton().", cache);

                            // Remove the dynamically created div element from the page
                            const entryDivToRemove = document.getElementById(`entry_${dateEntry.date}`);
                            if (entryDivToRemove) {
                                entryDivToRemove.remove();
                                console.log("Dynamically created div element removed from the page.");
                            } else {
                                console.error("Dynamically created div element not found.");
                            }
                        }
                    } catch (error) {
                        console.error('Error handling button click:', error);
                    }
                });

                // Append the button to the entry div
                entryDiv.appendChild(button);

                discrepanciesDiv.appendChild(entryDiv);
            }

        }

        // Add mismatching lessons to the discrepanciesDiv
        // TODO: Add a button to open the modal and prefill the fields
        if (mismatchingLessons.length > 0) {
            const mismatchingLessonsDiv = document.createElement('div');
            mismatchingLessonsDiv.className = 'mismatching-lessons';

            const titleDiv = document.createElement('div');
            titleDiv.textContent = 'Erinevus sissekannetes:';
            titleDiv.style.fontWeight = 'bold';
            titleDiv.style.color = 'red';
            mismatchingLessonsDiv.appendChild(titleDiv);

            mismatchingLessons.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.textContent = `${entry.date} - Timetable Lessons: ${entry.timetableLessons}, Journal Lessons: ${entry.journalLessons}`;
                entryDiv.style.color = 'red';
                mismatchingLessonsDiv.appendChild(entryDiv);
            });

            discrepanciesDiv.appendChild(mismatchingLessonsDiv);
        }

        return discrepanciesDiv;
    }

    return null;
}

// Function to get teacher and school data
async function getUserData(): Promise<{ schoolId: number, teacherId: number }> {
    const response = await get(`${baseUrl}hois_back/user`);
    const schoolId = response.school.id; // 9 = Viljandi Kutseõppekeskus
    // const teacherId = data.teacher;
    // TODO: Remove the hardcoded teacherId and uncomment the line below before merging to the main branch
    const teacherId = 18737; // Teacher Henno Täht for testing
    console.log("SchoolId:", schoolId, "TeacherId:", teacherId);
    return { schoolId, teacherId };
}

// Function to get timetable study years - startDate from the first study year and endDate from the last study year
async function fetchTimetableStudyYears(schoolId): Promise<{ beginDate: string, endDate: string }> {
    const timetableStudyYears = await get(`${baseUrl}hois_back/timetables/timetableStudyYears/${schoolId}`);
    // const userData = await timetableStudyYears.json();

    // Reject promise if there are no study years
    if (timetableStudyYears.length === 0) {
        return Promise.reject('No study years found.');
    }

    // TODO: Remove this hardcoded date and uncomment the line below
    const beginDate = "2023-07-31T00:00:00Z"; // 2023-07-31T00:00:00Z for testing
    // const beginDate = timetableStudyYears[0].startDate;
    const endDate: string = timetableStudyYears[timetableStudyYears.length - 1].endDate;

    console.log("Begin Date:", beginDate);
    console.log("End Date:", endDate);

    return { beginDate, endDate };

}

// Function to update cache with timetable events
async function updateCacheWithTimetableEvents(schoolId: number, teacherId: number, from: string, thru: string): Promise<void> {
    try {
        const timetableEventsResponse = await get(`${baseUrl}hois_back/timetableevents/timetableByTeacher/${schoolId}?from=${from}&lang=ET&teachers=${teacherId}&thru=${thru}`);
        console.log("Timetable Events Response:", timetableEventsResponse);

        // Check if timetableEvents exist directly under timetableEventsResponse
        if (!timetableEventsResponse || !timetableEventsResponse.timetableEvents) {
            console.error("Error: Timetable events data is missing or in unexpected format");
            return;
        }

        const filteredData = timetableEventsResponse.timetableEvents.filter(event => event.journalId !== null);
        console.log("Filtered Data:", filteredData);

        updateTimetableEventsInCache(filteredData);

        const uniqueJournalIds = Array.from(new Set(filteredData.map(event => event.journalId)));
        console.log("uniqueJournalIds", uniqueJournalIds);

        for (const journalId of uniqueJournalIds) {
            await updateCacheWithJournalEntries(journalId as number);
        }
    } catch (error) {
        console.error("Error occurred while updating cache with timetable events:", error);
    }
}

function updateTimetableEventsInCache(events: TimetableEventApiResponse[]): void {
    events.forEach(event => {
        let journal = cache.journals.find(j => j.id === event.journalId);
        if (!journal) {
            journal = createNewJournal(event.journalId, event.nameEt);
            cache.journals.push(journal);
        }

        // Find the corresponding lesson time based on the event's start time
        const lessonTime = cache.lessonTimes.find(lesson => lesson.timeStart === event.timeStart);
        let number = null;
        if (lessonTime) {
            number = lessonTime.number;
        }

        journal.entriesInTimetable.push({
            id: event.id,
            date: event.date,
            timeStart: event.timeStart,
            timeEnd: event.timeEnd,
            number: number
        });
    });
}

async function updateCacheWithJournalEntries(journalId) {
    const url = `${baseUrl}hois_back/journals/${journalId}/journalEntriesByDate`;
    try {
        const entries = await get(url);
        // Find the corresponding journal in the cache
        const journal = cache.journals.find(j => j.id === journalId);
        if (journal) {
            // Update the entriesInJournal array of the journal
            entries.forEach(entry => {
                // Check if the entry already exists in the array and has a non-null entryDate
                const existingEntry = journal.entriesInJournal.find(e => e.id === entry.id && e.entryDate !== null);
                if (!existingEntry && entry.entryDate !== null) {
                    journal.entriesInJournal.push({
                        entryDate: entry.entryDate,
                        nameEt: entry.nameEt,
                        entryType: entry.entryType,
                        lessons: entry.lessons,
                        id: entry.id,
                    });
                }
            });
        }

        // Count entries in entriesInTimetable by date
        const timetableCounts = {};
        journal.entriesInTimetable.forEach(timetableEntry => {
            if (!timetableEntry.date || new Date(timetableEntry.date) >= new Date()) return;
            timetableCounts[timetableEntry.date] = (timetableCounts[timetableEntry.date] || 0) + 1;
        });

        // Update count field in differences and copy lessons from entriesInJournal
        const allDates = new Set([...journal.entriesInTimetable.map(entry => entry.date), ...journal.entriesInJournal.map(entry => entry.entryDate)]);
        allDates.forEach(date => {
            // Find the minimum number for the given date
            const startLessonNr = Math.min(...journal.entriesInTimetable.filter(entry => entry.date === date).map(entry => entry.number));
            const journalEntry = journal.entriesInJournal.find(entry => entry.entryDate === date && entry.entryDate !== null);
            const timetableCount = timetableCounts[date] || 0;
            const lessonsInJournal = journalEntry && journalEntry.entryType === "SISSEKANNE_T" ? journalEntry.lessons : 0;
            const mismatch = lessonsInJournal > 0 && timetableCount > 0 && lessonsInJournal !== timetableCount;
            const missing_E = lessonsInJournal > 0 && timetableCount === 0;
            const missing_J = timetableCount > 0 && lessonsInJournal === 0;
            journal.differences.push({
                date,
                startLessonNr,
                timetableCount,
                lessonsInJournal,
                id: journalEntry ? journalEntry.id : null, // Add the id here
                mismatch,
                missing_E,
                missing_J
            });
        });

        // Set the hasDiscrepancy field based on differences
        const hasDiscrepancy = journal.differences.some(diff => diff.mismatch || diff.missing_E || diff.missing_J);
        journal.hasDiscrepancy = hasDiscrepancy;

        console.log(`Journal Entries (${journalId}):`, entries);
        // compareTimetableAndJournalEntries(journal);
    } catch (error) {
        console.error(`Error fetching journal entries: ${error}`);
    }
}

// // TODO: we should update data in the cache after POST request
// function updateJournalEntriesInCache(journalId: number, entries: JournalEntryApiResponse[]): void {
//     cache.journals = entries.map(entry => {
//         const journal = cache.journals.find(j => j.id === entry.id) || createNewJournal(journalId, entry.nameEt);
//         journal.entriesInJournal.push({
//             entryDate: entry.entryDate,
//             nameEt: entry.nameEt,
//             entryType: entry.entryType,
//             lessons: entry.lessons,
//             id: entry.id,
//         });
//         return journal;
//     });
// }

function createNewJournal(id: number, nameEt: string): Journal {
    return {
        id: id,
        nameEt: nameEt,
        hasDiscrepancy: false,
        entriesInTimetable: [],
        entriesInJournal: [],
        differences: [] as Difference[] // Use the Difference type as an array
    };
}

// Function to get current journalId from the edit page
function getCurrentJournalIdFromEditPage(): number | null {
    const url = window.location.href;
    const match = url.match(/\/journal\/(\d+)\/edit/);

    if (match && match[1]) {
        console.log("JournalId found in the URL:", parseInt(match[1], 10));
        return parseInt(match[1], 10);
    } else {
        console.error("JournalId not found in the URL.");
        return null;
    }
}

// Function to prefill the entry type field
function prefillEntryType(): void {
    console.log("prefillEntryType() called");

    setTimeout(() => {
        // Find the md-select element
        const selectElement = document.querySelector('md-select[aria-label="Sissekande liik"]');

        if (selectElement) {
            console.log("Select element found");

            // Create and dispatch a click event on the select element to open the dropdown menu
            const clickEvent = new MouseEvent('click', { bubbles: true });
            selectElement.dispatchEvent(clickEvent);

            // After a short delay, find the option with the value "SISSEKANNE_T" and trigger its selection
            setTimeout(() => {
                const optionToSelect = document.querySelector('md-option[value="SISSEKANNE_T"]') as HTMLElement;

                if (optionToSelect) {
                    console.log("Option to select found");

                    // Programmatically trigger a click event on the option to select it
                    optionToSelect.click();

                    console.log("Option selected successfully");
                } else {
                    console.error("Option to select not found.");
                }
            }, 100); // Adjust the delay as needed
        } else {
            console.error("Select element not found.");
        }
    }, 100); // Adjust the delay as needed
}

function preselectJournalEntryCapacityTypes(): void {
    setTimeout(() => {
        // Find all checkboxes with the specified aria-label
        const checkboxes = document.querySelectorAll('md-checkbox[aria-label="Auditoorne õpe"]');

        // Iterate over found checkboxes
        checkboxes.forEach((checkbox) => {
            // Simulate a click on the checkbox
            (checkbox as HTMLElement).click();
        });

        if (checkboxes.length === 0) {
            console.error("Checkbox not found.");
        }
    }, 100); // Adjust the delay as needed
}

// Function to prefill the date field
function prefillDateField(date: string): void {
    // Extract only the date portion from the provided date string
    const formattedDate = date.split('T')[0];

    // Find the input element for the date field
    const dateInput = document.querySelector('.md-datepicker-input') as HTMLInputElement;

    if (dateInput) {
        // Simulate user typing the date
        dateInput.focus();
        dateInput.value = formattedDate;
        dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: formattedDate }));
        dateInput.dispatchEvent(new KeyboardEvent('keypress', { key: formattedDate }));
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        dateInput.blur();
    } else {
        console.error("Date input element not found.");
    }
}

function fillLessonsAndStartLessonNr(startLessonNr: number, lessons: number): void {
    console.log("fillLessonsAndStartLessonNr() called");

    setTimeout(() => {
        // Find the md-select element for the start lesson number
        const selectElement = document.querySelector('md-select[aria-label="Algustund"]');

        if (selectElement) {
            console.log("Start Lesson Number select element found");

            // Create and dispatch a click event on the select element to open the dropdown menu
            const clickEvent = new MouseEvent('click', { bubbles: true });
            selectElement.dispatchEvent(clickEvent);

            // After a short delay, find the option with the corresponding value and trigger its selection
            setTimeout(() => {
                const optionToSelect = document.querySelector(`md-option[value="${startLessonNr}"]`) as HTMLElement;

                if (optionToSelect) {
                    console.log("Option to select found");

                    // Programmatically trigger a click event on the option to select it
                    optionToSelect.click();

                    console.log("Option selected successfully");

                    // Fill the lessons input field with the provided lessons
                    const lessonsInput = document.querySelector('input[name="lessons"]') as HTMLInputElement;
                    if (lessonsInput) {
                        lessonsInput.value = lessons.toString();
                        console.log("Lessons input filled with lessons:", lessons);

                        // Dispatch an input event to notify AngularJS of the input value change
                        const inputEvent = new Event('input', { bubbles: true });
                        lessonsInput.dispatchEvent(inputEvent);
                        console.log("Input event dispatched.");
                    } else {
                        console.error("Lessons input field not found.");
                    }
                } else {
                    console.error("Option to select not found.");
                }
            }, 500); // Adjust the delay as needed
        } else {
            console.error("Start Lesson Number select element not found.");
        }
    }, 500); // Adjust the delay as needed
}

function clickSaveButton(callback: () => void): void {
    setTimeout(() => {
        const saveButton = document.querySelector('button[ng-click="saveEntry()"]') as HTMLButtonElement;
        if (saveButton) {
            console.log("Save button found. Clicking...");
            saveButton.click();
            console.log("Save button clicked successfully.");
            callback(); // Execute the callback function once the save operation is complete
        } else {
            console.error("Save button not found.");
        }
    }, 2000); // Adjust the delay as needed
}

async function deleteJournal() {
    try {
        // Find the delete button
        setTimeout(() => {
            const deleteButton = document.querySelector('[ng-click="delete()"]');
            if (deleteButton instanceof HTMLElement) {
                // Simulate click event on the delete button
                deleteButton.click();

                // setTimeout(() => {
                const confirmButton = document.querySelector('button[ng-click="accept()"]') as HTMLButtonElement;
                if (confirmButton instanceof HTMLElement) {
                    // Simulate click event on the delete button
                    confirmButton.click();
                } else {
                    console.log('Accept button not found or does not exist.');
                }
                // }, 200); // Adjust the delay as needed
            } else {
                console.log('Delete button not found or does not exist.');
            }
        }, 1000); // Adjust the delay as needed
    } catch (error) {
        console.error('Error deleting journal:', error);
    }
}

function runActionAfterTimeout(action) {

    // Cancel the previous timeout if it exists
    if (timeoutId) {
        console.log('Cancelling previous timeout...');
        clearTimeout(timeoutId);
    }

    // Set timeout to ensure that the action is executed after the DOM is updated
    timeoutId = setTimeout(() => {
        console.log('Detected target elements. Executing action...');
        action();
    }, 100);
}

async function setUpUrlChangeListener(): Promise<void> {
    // Set up a MutationObserver to detect and act on DOM changes
    function setUpDOMMutationObserver(selector, action) {
        const observer = new MutationObserver(() => {
            const targets = document.querySelectorAll(selector);
            if (targets.length) {
                console.log('Detected target elements. Executing action...');
                runActionAfterTimeout(action);
                console.log('Disconnecting observer...');
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.onload = () => {
        console.log('Window loaded. Checking for actions to execute...');
        executeActionsBasedOnURL();
        enhanceSPAHistoryNavigation();
    };

    // Execute actions based on the current URL and configuration
    function executeActionsBasedOnURL() {
        const currentUrl = window.location.href;
        pageActionsConfig.forEach(config => {
            // Check if pageIndicator is an array
            if (Array.isArray(config.pageIndicator)) {
                // If it's an array, iterate over each page indicator
                const isPageIndicatorMatched = config.pageIndicator.some(indicator => currentUrl.includes(indicator));
                if (isPageIndicatorMatched) {
                    const targets = document.querySelectorAll(config.selector);
                    if (targets.length) {
                        runActionAfterTimeout(config.action);
                    } else {
                        setUpDOMMutationObserver(config.selector, config.action);
                    }
                }
            } else { // If it's not an array, treat it as a single string
                if (currentUrl.includes(config.pageIndicator)) {
                    const targets = document.querySelectorAll(config.selector);
                    if (targets.length) {
                        runActionAfterTimeout(config.action);
                    } else {
                        setUpDOMMutationObserver(config.selector, config.action);
                    }
                }
            }
        });
    }

    // Enhance SPA navigation to dynamically execute actions based on URL changes
    function enhanceSPAHistoryNavigation() {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            executeActionsBasedOnURL();
        };
        window.addEventListener('popstate', executeActionsBasedOnURL);
    }

}
