/** TYPES **/
import {DetailedError} from '@utils/DetailedError';

/** DEPENDENCIES **/
import type {Database, EntryInTimetable, Journal, JournalEntryApiResponse, TimetableEventApiResponse} from './types';

/** VARIABLES **/
let timeoutId = null;
let journalsElements = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';
let journalElement = '.ois-form-layout-padding';

const cache: Database = {
    journals: [],
    lessonTimes: [
        {
            number: 1,
            timeStart: "08:15",
            timeEnd: "09:00"
        },
        {
            number: 2,
            timeStart: "09:10",
            timeEnd: "09:55"
        },
        {
            number: 3,
            timeStart: "09:56",
            timeEnd: "10:40"
        },
        {
            number: 4,
            timeStart: "10:50",
            timeEnd: "11:35"
        },
        {
            number: 5,
            timeStart: "11:40",
            timeEnd: "12:25",
            note: "I kursuse lõuna"
        },
        {
            number: 6,
            timeStart: "12:30",
            timeEnd: "13:15",
            note: "II ja III kursuse lõuna"
        },
        {
            number: 7,
            timeStart: "13:20",
            timeEnd: "14:05"
        },
        {
            number: 8,
            timeStart: "14:10",
            timeEnd: "14:55"
        },
        {
            number: 9,
            timeStart: "15:00",
            timeEnd: "15:45"
        },
        {
            number: 10,
            timeStart: "15:55",
            timeEnd: "16:35"
        },
        {
            number: 11,
            timeStart: "16:45",
            timeEnd: "17:30"
        },
        {
            number: 12,
            timeStart: "17:40",
            timeEnd: "18:25"
        },
        {
            number: 13,
            timeStart: "18:35",
            timeEnd: "19:20"
        },
        {
            number: 14,
            timeStart: "19:30",
            timeEnd: "20:15"
        }
    ]
};

const pageActionsConfig = [
    {
        pageIndicator: '#/journals?_menu',
        selector: `${journalsElements} > td:nth-child(2) > a`,
        action: injectJournalPageComponents // Function to inject components on the journals page
    },
    // Template for adding more page configurations
    {
        pageIndicator: '#/journal/301576/edit',
        selector: `${journalElement}`,
        action: injectJournalPageComponents2 // Function for another page's component injection
    }
];

const mismatchedJournalIds: Set<number> = new Set();
const mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, journalId: number }[] = [];


// Extract base URL from example URLs
const baseUrl: string = extractBaseUrl();
// Function to extract base URL
function extractBaseUrl(): string {
    const url = window.location.href;
    const hashIndex = url.indexOf('#');
    return url.substring(0, hashIndex !== -1 ? hashIndex : undefined);
}


/** MAIN CODE **/
(async () => {
    try {
        // throw new DetailedError(404, 'Not Found', 'The requested resource was not found.');
        setUpUrlChangeListener().then(r => console.log('URL change listener set up.'));
        const {schoolId, teacherId} = await getUserData()
        const {beginDate, endDate} = await fetchTimetableStudyYears(schoolId)
        await updateCacheWithTimetableEvents(schoolId, teacherId, beginDate, endDate)
        console.log("Cache updated with timetable events.", cache)
    } catch (e) {
        // General error handler (all errors in app should be caught and handled only here, unless they are expected)
        console.error(e);

        // Show the error message to the user in a modal
        showMessage(e.message, e instanceof DetailedError ? e.title : 'Error');
    }
})();


/** FUNCTION DEFINITIONS **/
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

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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
            if (mismatchedJournalIds.has(journalId)) {
                console.log("Mismatched! JournalId:", journalId);
                // Create and style the span element
                const span = document.createElement('span');
                span.style.borderRadius = '4px';
                span.style.color = 'white';
                span.style.backgroundColor = 'red';
                span.style.padding = '4px';
                span.style.marginLeft = '5px';
                span.innerText = '!!!';

                // Insert the span element after the current element
                element.parentNode.insertBefore(span, element.nextSibling);
            }

        }
    }

    // Output the cached data
    console.log("journalsByTeacher", journalsByTeacher);

    // countEntries(journalsByTeacher);
    console.log(document.querySelectorAll(`${journalsElements}:nth-child(${journalLastIndex}) > td:nth-child(2) > a`));

    console.log("Mismatched Journal IDs:", mismatchedJournalIds);

}

function injectJournalPageComponents2(): void {
    
    const currentJournalId = getCurrentJournalIdFromEditPage();
    const container = document.querySelector(`${journalElement}`) as HTMLElement | null;

    if (container) {
        // Display missingEntriesInJournal
        updateCacheWithJournalEntries(currentJournalId);
    } else {
        console.error("Container not found on the webpage.");
    }


}

// Function to get teacher and school data
async function getUserData(): Promise<{ schoolId: number, teacherId: number }> {
    const response = await get(`${baseUrl}hois_back/user`);
    const schoolId = response.school.id; // 9 = Viljandi Kutseõppekeskus
    // const teacherId = data.teacher;
    // TODO: Remove the hardcoded teacherId and uncomment the line below before merging to the main branch
    const teacherId = 18737; // Teacher Henno Täht for testing
    console.log("SchoolId:", schoolId, "TeacherId:", teacherId);
        return {schoolId, teacherId};
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

    return {beginDate, endDate};

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
            number: number, // Add the number property
        });
    });
}

async function updateCacheWithJournalEntries(journalId: number): Promise<void> {
    const url = `${baseUrl}hois_back/journals/${journalId}/journalEntriesByDate`;
    try {
        const entries = await get(url);
        // Find the corresponding journal in the cache
        const journal = cache.journals.find(j => j.id === journalId);
        if (journal) {
            // Update the entriesInJournal array of the journal
            entries.forEach(entry => {
                // Check if the entry already exists in the array
                const existingEntry = journal.entriesInJournal.find(e => e.id === entry.id);
                if (!existingEntry) {
                    journal.entriesInJournal.push({
                        entryDate: entry.entryDate,
                        nameEt: entry.nameEt,
                        entryType: entry.entryType,
                        startLessonNr: entry.startLessonNr,
                        lessons: entry.lessons,
                        id: entry.id,
                    });
                }
            });
        }

        console.log(`Journal EntriesXXX (${journalId}):`, entries);
        compareTimetableAndJournalEntries(journal);
    } catch (error) {
        console.error(`Error fetching journal entries: ${error}`);
    }
}

// TODO: we should update data in the cache after POST request
function updateJournalEntriesInCache(journalId: number, entries: JournalEntryApiResponse[]): void {
    cache.journals = entries.map(entry => {
        const journal = cache.journals.find(j => j.id === entry.id) || createNewJournal(journalId, entry.nameEt);
        journal.entriesInJournal.push({
            entryDate: entry.entryDate,
            nameEt: entry.nameEt,
            entryType: entry.entryType,
            startLessonNr: entry.startLessonNr,
            lessons: entry.lessons,
            id: entry.id,
        });
        return journal;
    });
}

function createNewJournal(id: number, nameEt: string): Journal {
    return {
        id: id,
        nameEt: nameEt,
        entriesInTimetable: [],
        entriesInJournal: []
    };
}

// Function to compare entriesInTimetable and entriesInJournal
function compareTimetableAndJournalEntries(journal: Journal): void {
    const matchingDates: { date: string, journalId: number }[] = [];
    const missingEntriesInJournalMap: Map<string, {
        date: string,
        journalId: number,
        countLessonsInTimetable: number
    }> = new Map();
    const missingEntriesInTimetable: { date: string, journalId: number }[] = [];
    const mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, journalId: number }[] = [];

    // Filter entries in entriesInJournal with entryType: 'SISSEKANNE_T'
    const relevantEntriesInJournal = journal.entriesInJournal.filter(entry => entry.entryType === 'SISSEKANNE_T');

    relevantEntriesInJournal.forEach(entry => {
        const timetableEntriesOnDate = journal.entriesInTimetable.filter(timetableEntry =>
            timetableEntry.date === entry.entryDate
        );

        if (timetableEntriesOnDate.length > 0) {
            matchingDates.push({date: entry.entryDate, journalId: journal.id});
        } else {
            const countLessons = countLessonsInTimetable(entry.entryDate, journal.id);
            missingEntriesInTimetable.push({date: entry.entryDate, journalId: journal.id});

            // Store unique values in a Map
            const key = `${entry.entryDate}_${journal.id}`;
            if (countLessons > 0 && !missingEntriesInJournalMap.has(key)) {
                missingEntriesInJournalMap.set(key, {
                    date: entry.entryDate,
                    journalId: journal.id,
                    countLessonsInTimetable: countLessons
                });
            }
        }

        // Compare counted timetable lessons with journal lessons
        const timetableLessons = countLessonsInTimetable(entry.entryDate, journal.id);
        if (timetableLessons !== entry.lessons) {
            if (timetableLessons !== 0) {
                mismatchingLessons.push({
                    date: entry.entryDate,
                    timetableLessons: timetableLessons,
                    journalLessons: entry.lessons,
                    journalId: journal.id,
                });
                console.log("Added mismatching lesson:", entry.entryDate, timetableLessons, entry.lessons, journal.id);
                mismatchedJournalIds.add(journal.id); // Add mismatched journalId to the dataset
            }
        }

    });

    // Check for lessons in entriesInTimetable not present in entriesInJournal
    journal.entriesInTimetable.forEach(timetableEntry => {
        const isMatchingDate = relevantEntriesInJournal.some(entry => entry.entryDate === timetableEntry.date);
        if (!isMatchingDate) {
            const countLessons = countLessonsInTimetable(timetableEntry.date, journal.id);

            // Store unique values in a Map
            const key = `${timetableEntry.date}_${journal.id}`;
            if (countLessons > 0 && !missingEntriesInJournalMap.has(key)) {
                missingEntriesInJournalMap.set(key, {
                    date: timetableEntry.date,
                    journalId: journal.id,
                    countLessonsInTimetable: countLessons
                });
            }
        }
    });

    // Convert Map values to array
    const missingEntriesInJournal = Array.from(missingEntriesInJournalMap.values());

    // Log or use the arrays as needed
    console.log("Matching Dates:", matchingDates);
    console.log("Missing Entries in Journal:", missingEntriesInJournal);
    console.log("Missing Entries in Timetable:", missingEntriesInTimetable);
    console.log("Mismatching Lessons:", mismatchingLessons);

    // Call this function after fetching and comparing data
    displayMissingEntriesInJournalAndTimetable(missingEntriesInJournal, missingEntriesInTimetable, mismatchingLessons);

    // anotherFunction(); // Call anotherFunction here since we want to call it after the comparison
}

// Function to count unique lessons in entriesInTimetable per date and journalId
function countLessonsInTimetable(date: string, journalId: number): number {
    const uniqueLessons = new Set<number>();

    cache.journals.forEach(journal => {
        if (journal.id === journalId) {
            const timetableEntriesOnDate = journal.entriesInTimetable.filter(entry =>
                entry.date === date && entry.number !== null
            );
            timetableEntriesOnDate.forEach(entry => {
                uniqueLessons.add(entry.number);
            });
        }
    });

    return uniqueLessons.size;
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

// Function to display missingEntriesInJournal and missingEntriesInTimetable on the webpage
function displayMissingEntriesInJournalAndTimetable(
    missingEntriesInJournal: { date: string, journalId: number, countLessonsInTimetable: number }[],
    missingEntriesInTimetable: { date: string, journalId: number }[],
    mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, journalId: number }[]
): void {
    const currentJournalId = getCurrentJournalIdFromEditPage();
    const container = document.querySelector('.ois-form-layout-padding') as HTMLElement | null;

    if (container) {
        // Display missingEntriesInJournal
        displayMissingEntriesInJournal(container, missingEntriesInJournal, currentJournalId);

        // Display missingEntriesInTimetable
        displayMissingEntriesInTimetable(container, missingEntriesInTimetable, currentJournalId);

        // Display mismatchingLessons
        displayMismatchingLessons(container, mismatchingLessons, currentJournalId);
    } else {
        console.error("Container not found on the webpage.");
    }
}

// Function to display missingEntriesInJournal on the webpage
function displayMissingEntriesInJournal(
    container: HTMLElement,
    missingEntriesInJournal: { date: string, journalId: number, countLessonsInTimetable: number }[],
    currentJournalId: number | null
): void {
    if (currentJournalId === null) {
        console.error("Cannot determine current journalId from the URL.");
        return;
    }

    const missingEntriesDiv = document.createElement('div');
    missingEntriesDiv.className = 'missing-entries';

    // Filter and map the dates for the current journalId
    const dateMessages = missingEntriesInJournal
        .filter(entry => entry.journalId === currentJournalId)
        .map(entry => formatDate(entry.date));

    // Create and append content to the missingEntriesDiv
    if (dateMessages.length > 0) {
        const titleDiv = document.createElement('div');
        titleDiv.textContent = 'Sissekandmata tunnid (Journal):';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = 'red'; // Set the title text color to red
        missingEntriesDiv.appendChild(titleDiv);

        dateMessages.forEach(dateMessage => {
            const entryDiv = document.createElement('div');
            entryDiv.textContent = dateMessage;
            entryDiv.style.color = 'red'; // Set the text color to red

            // Create a button element
            const button = document.createElement('button');
            button.className = 'md-raised md-primary md-button md-ink-ripple';
            button.textContent = 'Lisa'; // Set the text content of the button if needed

            // Attach event listener to the button to simulate button click and open modal
            button.addEventListener('click', async () => {
                const dateToSearch = dateMessage; // Date format: YYYY-MM-DD
                const convertedDate: string = dateToSearch.split('.').reverse().join('-') + 'T00:00:00Z';
                const selectedJournalIds = [currentJournalId];

                const result = selectedJournalIds.map(journalId => {
                    const journal = cache.journals.find(journal => journal.id === journalId);
                    const relevantEntries: EntryInTimetable[] = journal?.entriesInTimetable.filter(entry => entry.date.startsWith(convertedDate)) || [];

                    return {
                        journalId: journalId,
                        date: convertedDate,
                        number: relevantEntries.length > 0 ? Math.min(...relevantEntries.map(entry => entry.number || 0)) : null,
                        lessons: relevantEntries.length
                    };
                });

                console.log("URM: ", result);
                const userData = await getUserData();
                const teacherId = userData.teacherId;

                let data = {
                    "journalId": result[0]?.journalId,
                    "startLessonNr": result[0]?.number,
                    "lessons": result[0]?.lessons,
                    "entryType": "SISSEKANNE_T",
                    "nameEt": "Tund",
                    "entryDate": result[0]?.date,
                    "content": "TUND!!!",
                    "journalEntryStudents": [],
                    "journalEntryCapacityTypes": [
                        "MAHT_a"
                    ],
                    "journalEntryTeachers": [
                        // "20659",
                        teacherId
                    ]
                };

                let journalIdx = result[0]?.journalId;

                console.log(`Data(${journalIdx}) :`, data);

                // Call simulateJournalEntry function on button click
                await simulateJournalEntry(data);
            });

            // Append the button element to the entryDiv
            entryDiv.appendChild(button);

            missingEntriesDiv.appendChild(entryDiv);
        });
    } else {
        console.error("No missing entries in Journal to display for the current journal.");
    }

    // Append missingEntriesDiv to the container
    container.appendChild(missingEntriesDiv);
}

// Function to display missingEntriesInTimetable on the webpage
function displayMissingEntriesInTimetable(
    container: HTMLElement,
    missingEntriesInTimetable: { date: string, journalId: number }[],
    currentJournalId: number | null
): void {
    if (currentJournalId === null) {
        console.error("Cannot determine current journalId from the URL.");
        return;
    }

    const missingEntriesDiv = document.createElement('div');
    missingEntriesDiv.className = 'missing-entries';

    // Filter and map the dates for the current journalId
    const dateMessages = missingEntriesInTimetable
        .filter(entry => entry.journalId === currentJournalId)
        .map(entry => formatDate(entry.date));

    // Create and append content to the missingEntriesDiv
    if (dateMessages.length > 0) {
        const titleDiv = document.createElement('div');
        titleDiv.textContent = 'Vaste tunniplaanis puudub (Timetable):';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = 'red'; // Set the title text color to red
        missingEntriesDiv.appendChild(titleDiv);

        dateMessages.forEach(dateMessage => {
            const entryDiv = document.createElement('div');
            entryDiv.textContent = dateMessage;
            entryDiv.style.color = 'red'; // Set the text color to red
            missingEntriesDiv.appendChild(entryDiv);
        });
    } else {
        console.error("No missing entries in Timetable to display for the current journal.");
    }

    // Append missingEntriesDiv to the container
    container.appendChild(missingEntriesDiv);
}

// Function to display mismatchingLessons on the webpage
function displayMismatchingLessons(
    container: HTMLElement,
    mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, journalId: number }[],
    currentJournalId: number | null
): void {
    // Filter mismatchingLessons for the current journalId
    const mismatchingLessonsForCurrentJournal = mismatchingLessons
        .filter(entry => entry.journalId === currentJournalId);

    if (mismatchingLessonsForCurrentJournal.length > 0) {
        const mismatchingLessonsDiv = document.createElement('div');
        mismatchingLessonsDiv.className = 'mismatching-lessons';

        // Create and append content to the mismatchingLessonsDiv
        const titleDiv = document.createElement('div');
        titleDiv.textContent = 'Erinevus sissekannetes:';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = 'red'; // Set the title text color to red
        mismatchingLessonsDiv.appendChild(titleDiv);

        mismatchingLessonsForCurrentJournal.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.textContent = `${formatDate(entry.date)} - Timetable Lessons: ${entry.timetableLessons}, Journal Lessons: ${entry.journalLessons}`;
            entryDiv.style.color = 'red'; // Set the text color to red
            mismatchingLessonsDiv.appendChild(entryDiv);
        });

        // Append mismatchingLessonsDiv to the container
        container.appendChild(mismatchingLessonsDiv);
    } else {
        console.error("No mismatching lessons to display for the current journal.");
    }
}

// Placeholder function to simulate journal entry
async function simulateJournalEntry(data: any): Promise<void> {
    // Your simulation logic for journal entry goes here
    console.log("Simulating journal entry with data:", data);
    
    // Once journal entry is simulated, trigger the modal to open
    triggerModalOpening(data);
}

// Function to trigger the opening of the modal and prefill fields
function triggerModalOpening(data: any): void {
    // Find the element that triggers the modal opening and trigger its click event
    const modalTriggerButton = document.querySelector('[ng-click="addNewEntry()"]') as HTMLElement;

    if (modalTriggerButton) {
        modalTriggerButton.click();

        // Wait for a short delay before attempting to prefill the fields in the opened modal
        setTimeout(() => prefillModalFields(data), 100); // Pass data to prefillModalFields
    } else {
        console.error("Modal trigger button not found.");
    }
}

// Function to prefill fields in the opened modal
function prefillModalFields(data: any): void {
    // Prefill the entry type field
    prefillEntryType();

    // Prefill the date field
    prefillDateField(data);
}

// Function to prefill the entry type field
function prefillEntryType(): void {
    console.log("prefillEntryType() called");

    setTimeout(() => {
        // Select the md-option element directly based on its value attribute
        const optionToSelect = document.querySelector('#dialogContent_70 md-option[value="SISSEKANNE_T"]') as HTMLElement;

        if (optionToSelect) {
            console.log("Option to select found");

            // Click the option to select it
            optionToSelect.click();

            console.log("Option selected successfully");

            // Find the md-select element and trigger a click event to close the dropdown
            const mdSelect = document.querySelector('#select_59') as HTMLElement;
            if (mdSelect) {
                // Delay the click event on mdSelect to ensure the dropdown has fully closed
                setTimeout(() => {
                    mdSelect.click();
                    console.log("md-select click event triggered");
                }, 500); // Adjust the delay as needed
            } else {
                console.error("md-select element not found.");
            }
        } else {
            console.error("Option to select not found.");
        }
    }, 500); // Adjust the delay as needed
}

// Flag to track if the select element is already open
let isSelectOpen = false;

// Function to prefill the date field
function prefillDateField(data: any): void {
    // Log data.entryDate
    console.log("Entry Date:", data.entryDate);

    // Extract only the date portion from entryDate
    const entryDate = new Date(data.entryDate).toISOString().split('T')[0];

    // Select the select element directly
    const selectElement = document.querySelector('#select_110') as HTMLSelectElement;

    if (!selectElement) {
        console.error("Select element not found.");
        return;
    }

    // If the select element is already open, don't open it again
    if (isSelectOpen) {
        console.log("Select element is already open.");
        return;
    }

    // Function to handle select open event
    const handleSelectOpen = () => {
        console.log("Select element opened.");
        isSelectOpen = true;

        // Log all option values
        const options = document.querySelectorAll('#select_110 md-option');

        let optionFound = false;
        options.forEach((option: HTMLElement) => {
            // Extract only the date portion from the option value
            const optionValue = option.getAttribute('value')?.split('T')[0];

            // Compare the date portions
            if (entryDate === optionValue) {
                // Click the option to select it
                option.click();
                optionFound = true;
            }
        });

        if (!optionFound) {
            console.error("Option with value matching entryDate not found.");
        }

        // Remove event listener once the select element is closed
        document.removeEventListener('click', handleSelectOpen);
        isSelectOpen = false;
    };

    // Attach event listener to detect when the select element is opened
    document.addEventListener('click', handleSelectOpen);

    // Click the select element to open it
    selectElement.click();
}


// Function to preselect the journal entry capacity types
function preselectJournalEntryCapacityTypes(): void {
    // Find the checkbox element based on its aria-label
    const checkbox = document.querySelector('md-checkbox[aria-label="Auditoorne õpe"]') as HTMLElement;

    if (checkbox) {
        // Click the checkbox to select it
        checkbox.click();
    } else {
        console.error("Checkbox not found.");
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
    // Enhance SPA navigation to dynamically execute actions based on URL changes
    function enhanceSPAHistoryNavigation() {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            executeActionsBasedOnURL();
        };
        window.addEventListener('popstate', executeActionsBasedOnURL);
    }

    // Execute actions based on the current URL and configuration
    function executeActionsBasedOnURL() {
        const currentUrl = window.location.href;
        pageActionsConfig.forEach(config => {
            if (currentUrl.includes(config.pageIndicator)) {
                const targets = document.querySelectorAll(config.selector);
                if (targets.length) {
                    runActionAfterTimeout(config.action);

                } else {
                    setUpDOMMutationObserver(config.selector, config.action);
                }
            }
        });
    }

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
        observer.observe(document.body, {childList: true, subtree: true});
    }

    window.onload = () => {
        console.log('Window loaded. Checking for actions to execute...');
        executeActionsBasedOnURL();
        enhanceSPAHistoryNavigation();
    };
}
