import axios from 'axios';
import type { AxiosResponse } from 'axios';

import type {
    Database,
    Journal,
    JournalEntryApiResponse,
    EntryInTimetable,
    TimetableByTeacherResponse,
    TimetableEventApiResponse
} from './types';

let timeoutId = null;

// Define the selector for the journal elements
let journalsElements = '#main-content > div.layout-padding > div > md-table-container > table > tbody > tr';

const pageActionsConfig = [
    {
        pageIndicator: '#/journals?_menu',
        selector: `${journalsElements} > td:nth-child(2) > a`,
        action: injectJournalPageComponents // Function to inject components on the journals page
    },
    // Template for adding more page configurations
    {
        pageIndicator: '#/anotherPage',
        selector: '#another-selector',
        action: injectJournalPageComponents // Function for another page's component injection
    }
];

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

// Save current URL to variable
const currentUrl: string = window.location.href;

// Function to extract base URL
function extractBaseUrl(url: string): string {
    // Find the index of '#'
    const hashIndex = url.indexOf('#');
    // Remove everything after '#' including '#'
    const baseUrl = url.substring(0, hashIndex !== -1 ? hashIndex : undefined);
    return baseUrl;
}

// Extract base URL from example URLs
const baseUrl: string = extractBaseUrl(currentUrl);

// Function to get teacher and school data
async function getUserData(): Promise<{ schoolId: number, teacherId: number }> {
    const response = await fetch(`${baseUrl}hois_back/user`);
    const data = await response.json();
    const schoolId = data.school.id; // 9 = Viljandi Kutseõppekeskus
    // const teacherId = data.teacher;
    const teacherId = 18737; // Teacher Henno Täht for testing
    return { schoolId, teacherId };
}

// Function to get timetable study years - startDate from the first study year and endDate from the last study year
async function fetchTimetableStudyYears() {
    const response = await fetch(`${baseUrl}hois_back/timetables/timetableStudyYears/9`);
    const timetableStudyYears = await response.json();

    if (timetableStudyYears.length > 0) {

        // TODO: Remove the hardcoded date and uncomment the line below
        // const firstStartDate = timetableStudyYears[0].startDate;
        const firstStartDate = "2023-07-31T00:00:00Z"; // 2023-07-31T00:00:00Z for testing

        const lastEndDate = timetableStudyYears[timetableStudyYears.length - 1].endDate;

        console.log("First Start Date:", firstStartDate);
        console.log("Last End Date:", lastEndDate);

        // Now we can call getUserData and updateCacheWithTimetableEvents with the schoolId, teacherId and dates dynamically
        getUserData().then(({ schoolId, teacherId }) => {
            updateCacheWithTimetableEvents(schoolId, teacherId, firstStartDate, lastEndDate).then(() => console.log(cache));
        });
    } else {
        console.error("Timetable study years array is empty.");
    }
}

// Call the async function
fetchTimetableStudyYears();

// Declare cache
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

// Function to update cache with timetable events
async function updateCacheWithTimetableEvents(schoolId: number, teacherId: number, from: string, thru: string): Promise<void> {
    const url = `${baseUrl}hois_back/timetableevents/timetableByTeacher/${schoolId}?from=${from}&lang=ET&teachers=${teacherId}&thru=${thru}`;
    try {
        const data = await fetchData<TimetableByTeacherResponse>(url);

        // Filter out data where journalId is null
        const filteredData = data.timetableEvents.filter(event => event.journalId !== null);

        // console.log("Filtered Data:", filteredData);

        // debugger
        updateTimetableEventsInCache(filteredData);

        // Extract unique journalIds from the timetable events
        const uniqueJournalIds = Array.from(new Set(filteredData.map(event => event.journalId)));
        console.log("uniqueJournalIds", uniqueJournalIds);

        // For each unique journalId, fetch and update cache with journal entries
        for (const journalId of uniqueJournalIds) {
            // @ts-ignore
            await updateCacheWithJournalEntries(journalId);
        }
    } catch (error) {
        console.error(`Error fetching timetable events: ${error}`);
    }
}

async function fetchData<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return response.json();
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
        const entries = await fetchData<JournalEntryApiResponse[]>(url);
        // Find the corresponding journal in the cache
        const journal = cache.journals.find(j => j.id === journalId);
        if (journal) {
            // Update the entriesInJournal array of the journal
            entries.forEach(entry => {
                journal.entriesInJournal.push({
                    entryDate: entry.entryDate,
                    nameEt: entry.nameEt,
                    entryType: entry.entryType,
                    startLessonNr: entry.startLessonNr,
                    lessons: entry.lessons,
                    id: entry.id,
                });
            });
        }
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

// Define mismatchedJournalIds as a global variable
const mismatchedJournalIds: Set<number> = new Set();
const mismatchingLessons: { date: string, timetableLessons: number, journalLessons: number, journalId: number }[] = [];

// Function to compare entriesInTimetable and entriesInJournal
function compareTimetableAndJournalEntries(journal: Journal): void {
    const matchingDates: { date: string, journalId: number }[] = [];
    const missingEntriesInJournalMap: Map<string, { date: string, journalId: number, countLessonsInTimetable: number }> = new Map();
    const missingEntriesInTimetable: { date: string, journalId: number }[] = [];

    // Filter entries in entriesInJournal with entryType: 'SISSEKANNE_T'
    const relevantEntriesInJournal = journal.entriesInJournal.filter(entry => entry.entryType === 'SISSEKANNE_T');

    relevantEntriesInJournal.forEach(entry => {
        const timetableEntriesOnDate = journal.entriesInTimetable.filter(timetableEntry =>
            timetableEntry.date === entry.entryDate
        );

        if (timetableEntriesOnDate.length > 0) {
            matchingDates.push({ date: entry.entryDate, journalId: journal.id });
        } else {
            const countLessons = countLessonsInTimetable(entry.entryDate, journal.id);
            missingEntriesInTimetable.push({ date: entry.entryDate, journalId: journal.id });

            // Store unique values in a Map
            const key = `${entry.entryDate}_${journal.id}`;
            if (countLessons > 0 && !missingEntriesInJournalMap.has(key)) {
                missingEntriesInJournalMap.set(key, { date: entry.entryDate, journalId: journal.id, countLessonsInTimetable: countLessons });
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
                missingEntriesInJournalMap.set(key, { date: timetableEntry.date, journalId: journal.id, countLessonsInTimetable: countLessons });
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

// console.log("Mismatched Journal IDs:", mismatchedJournalIds);
// // Another function where you want to use mismatchedJournalIds
// function anotherFunction(): void {
//     console.log("Mismatched Journal IDs:", Array.from(mismatchedJournalIds));
// }

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

            // Attach event listener to the button
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

                // Call postJournalEntry function on button click
                await postJournalEntry(data);
            });

            // Call this function to reload the page
            function reloadPage() {
                window.location.reload();
            }

            async function postJournalEntry(data: any): Promise<void> {
                try {
                    const response: AxiosResponse = await axios.post(`${baseUrl}hois_back/journals/${data.journalId}/journalEntry`, data);
                    console.log(`Response (${data.journalId}):`, response.data);
                    // Handle response

                    // After successful POST request, send multiple GET requests
                    await Promise.all([
                        getAndUpdateUsedHours(data),
                        // getUsedHours(),
                        getJournalStudents(data),
                        getJournalEntriesByDate(data),
                        getJournalEntry(data)
                    ]);

                    // Reload the page after all operations are completed
                    reloadPage();

                } catch (error) {
                    console.error('Error:', error);
                    // Handle error
                }
            }

            // Function to update the displayed used hours
            function updateUsedHoursOnPage(usedHoursData: any): void {
                const capacityHours = usedHoursData.capacityHours;

                // Iterate through capacityHours data and update the corresponding elements on the page
                capacityHours.forEach((capacityHour: any) => {
                    const capacity = capacityHour.capacity;
                    const usedHours = capacityHour.usedHours;

                    // Find the elements on the page corresponding to the capacity and update their content
                    const elementsToUpdate = document.querySelectorAll(`span:contains('${capacity}:') + span`);
                    elementsToUpdate.forEach((element: HTMLElement) => {
                        // Update the content of the element
                        element.textContent = `${capacityHour.plannedHours}/${usedHours}`;
                    });
                });
            }

            // Function to get used hours data and update the displayed used hours on the page
            async function getAndUpdateUsedHours(data: any): Promise<void> {
                try {
                    const response: AxiosResponse = await axios.get(`${baseUrl}hois_back/journals/${data.journalId}/usedHours`);
                    console.log('Used Hours Response:', response.data);

                    // Update the displayed used hours on the page
                    updateUsedHoursOnPage(response.data);
                } catch (error) {
                    console.error('Error:', error);
                    // Handle error
                }
            }
            // Function to send GET request for journalStudents
            async function getJournalStudents(data: any): Promise<void> {
                try {
                    const response: AxiosResponse = await axios.get(`${baseUrl}hois_back/journals/${data.journalId}/journalStudents?allStudents=false`);
                    console.log('Journal Students Response:', response.data);
                    // Handle response
                } catch (error) {
                    console.error('Error:', error);
                    // Handle error
                }
            }

            // Function to send GET request for journalEntriesByDate
            async function getJournalEntriesByDate(data: any): Promise<void> {
                try {
                    const response: AxiosResponse = await axios.get(`${baseUrl}hois_back/journals/${data.journalId}/journalEntriesByDate?allStudents=false`);
                    console.log('Journal Entries By Date Response:', response.data);
                    // Handle response
                } catch (error) {
                    console.error('Error:', error);
                    // Handle error
                }
            }

            // Function to send GET request for journalEntry
            async function getJournalEntry(data: any): Promise<void> {
                try {
                    const response: AxiosResponse = await axios.get(`${baseUrl}hois_back/journals/${data.journalId}/journalEntry?lang=ET&page=0&size=20`);
                    console.log('Journal Entry Response:', response.data);
                    // Handle response
                } catch (error) {
                    console.error('Error:', error);
                    // Handle error
                }
            }

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

function observeAndActOnPageChanges() {
    console.log('Observing page changes for dynamic component injection...');

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
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.onload = () => {
        console.log('Window loaded. Checking for actions to execute...');
        executeActionsBasedOnURL();
        enhanceSPAHistoryNavigation();
    };
}
observeAndActOnPageChanges();

// Function to format date to DD.MM.YYYY
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

console.log("Cache:", cache);
