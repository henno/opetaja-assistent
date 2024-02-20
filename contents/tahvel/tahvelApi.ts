import TableComponent from './TableComponent.svelte';

function setupActionListener() {
    document.addEventListener('click', function (e) {
        if (!(e.target instanceof Element)) return;

        // Check if the clicked element or its parents have a matching role for any button
        const clickedElement = e.target.closest(".md-button.md-ink-ripple");

        // Proceed if we found a matching element and it has an 'ng-click' attribute
        if (clickedElement && clickedElement.getAttribute('ng-click')) {
            const ngClickValue = clickedElement.getAttribute('ng-click');

            // Check if the ng-click attribute value matches either the save or delete confirmation function
            if (ngClickValue === 'saveEntry()' || ngClickValue === 'accept()') {
                console.log("Action button clicked (save or delete), preparing to refetch data...");
                setTimeout(() => {
                    fetchData(); // Refetch data after a delay
                }, 1000); // Adjust delay as necessary
            }
        }
    });
}

// Function to fetch and manipulate JSON data

async function fetchData() {
    try {
        // Fetch user data
        const response = await fetch('https://test.tahvel.eenet.ee/hois_back/user');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the response data
        const data = await response.json();

        // Extract the desired properties from the data
        const teacherId = data.teacher;
        // const fullName = data.fullname;
        const schoolId = data.school.id;

        // Fetch the second set of data using the school ID
        const timetableResponse = await fetch(`https://test.tahvel.eenet.ee/hois_back/timetables/timetableStudyYears/${schoolId}`);
        const ttdata = await timetableResponse.json();

        // Fetch all available lessonplans - FOR loop starts here
        for (const item of ttdata) {
            console.log("------------------");
            const id = item.id;
            const startDate = item.startDate;
            const endDate = item.endDate;

            // Planeeritud koormused
            const JournalResponse = await fetch(`https://test.tahvel.eenet.ee/hois_back/lessonplans/byteacher/${teacherId}/${id}`);
            const journalData = await JournalResponse.json();
            // console.log(`Koormused: Journal Data for ID ${id}:`, journalData);

            // Process and count "MAHT_i" and "MAHT_a" grouped by journal's id
            const journalCounts = countHoursByJournalId(journalData);
            console.log(`Koormused ${id}:`, journalCounts);

            // Tunniplaan - tunniplaani kantud tundide arvutus
            const lessonsResponse = await fetch(`https://test.tahvel.eenet.ee/hois_back/timetableevents/timetableByTeacher/${schoolId}?from=${startDate}&lang=ET&teachers=18737&thru=${endDate}`); // õpetaja Henno ID - meie omaga ei tule infot
            // const lessonsResponse = await fetch(`https://test.tahvel.eenet.ee/hois_back/timetableevents/timetableByTeacher/${schoolId}?from=${startDate}&lang=ET&teachers=${teacherId}&thru=${endDate}`);
            try {
                if (!lessonsResponse.ok) {
                    throw new Error(`HTTP error! status: ${lessonsResponse.status}`);
                }
                const lessonData = await lessonsResponse.json();

                if (lessonData && Array.isArray(lessonData.timetableEvents)) {
                    // Adjust the type to support counting by journalId and date
                    const journalIdCounts: { [key: number]: { [date: string]: number } } = {};

                    // Count occurrences of each journalId and date
                    lessonData.timetableEvents.forEach((event: { journalId: number, date: string }) => {
                        const { journalId, date } = event;
                        if (journalId !== null && date) {
                            if (!journalIdCounts[journalId]) {
                                journalIdCounts[journalId] = {};
                            }
                            if (!journalIdCounts[journalId][date]) {
                                journalIdCounts[journalId][date] = 0;
                            }
                            journalIdCounts[journalId][date] += 1;
                        }
                    });

                    // Now journalIdCounts[journalId][date] gives the count of events for that journalId on that date
                    console.log(`Tunniplaan: Lesson data Counts for ${id}:`, journalIdCounts);

                    // Võrdleme koormusi tunniplaanis olevate andmetega
                    for (const journalId in journalIdCounts) {
                        if (journalCounts[journalId]) {
                            const journalCountA = journalCounts[journalId].MAHT_a;
                            const journalIdCount = journalIdCounts[journalId];

                            // Leiame päevikusse sisse kantud tunnid
                            const insertedLessonsResponse = await fetch(`https://test.tahvel.eenet.ee/hois_back/journals/${journalId}/journalEntry?lang=ET`);
                            if (!insertedLessonsResponse.ok) {
                                throw new Error(`HTTP error! status: ${insertedLessonsResponse.status}`);
                            }
                            // entryDate
                            const insertedData = await insertedLessonsResponse.json();

                            // Create an object to store the sum of lessons for each entryType and entryDate
                            const sumByEntryTypeAndDate = {};

                            // Iterate through the content array
                            insertedData.content.forEach(entry => {
                                const { entryType, lessons, entryDate } = entry;
                                const uniqueKey = `${entryDate}-${entryType}`;

                                // If the uniqueKey is not in the sumByEntryTypeAndDate object, initialize it with lessons
                                if (!sumByEntryTypeAndDate[uniqueKey]) {
                                    sumByEntryTypeAndDate[uniqueKey] = {
                                        journalId: journalId,
                                        entryDate: entryDate,
                                        entryType: entryType,
                                        sum: lessons
                                    };
                                } else {
                                    // If the uniqueKey already exists in the object, add the lessons to the existing sum
                                    sumByEntryTypeAndDate[uniqueKey].sum += lessons;
                                }
                            });

                            // Convert the object into an array of sums
                            const sumArray = Object.values(sumByEntryTypeAndDate);

                            console.log("Summeeritud tunnid:", sumArray);

                            interface SumEntry {
                                journalId: string;
                                entryDate: string;
                                entryType: string;
                                sum: number;
                            }

                            // Assuming lessonData and sumArray are already fetched and available

                            // Log the structure of lessonData
                            console.log("Lesson Data:", lessonData);

                            // Initialize an object to store counts for each journalId and entryDate
                            const countMap: { [journalId: string]: { [entryDate: string]: number } } = {};

                            // Iterate over timetableEvents in lessonData to populate countMap
                            lessonData.timetableEvents.forEach((event: any) => {
                                const { journalId, date } = event;
                                // If the journalId is not yet in the countMap, initialize it
                                if (!countMap[journalId]) {
                                    countMap[journalId] = {};
                                }
                                // If the entryDate is not yet in the countMap for the journalId, initialize it with count 0
                                if (!countMap[journalId][date]) {
                                    countMap[journalId][date] = 0;
                                }
                                // Increment the count for the corresponding journalId and entryDate
                                countMap[journalId][date]++;
                            });

                            // Iterate over sumArray to compare sums with counts
                            const comparisonResults: { entryDate: string, matches: boolean }[] = [];
                            sumArray.forEach((sumEntry: any) => {
                                const { journalId, entryDate, entryType, sum } = sumEntry;
                                // Check if the entryType is "SISSEKANNE_T"
                                if (entryType === "SISSEKANNE_T") {
                                    // Get the count from countMap for the corresponding journalId and entryDate
                                    const count = countMap[journalId]?.[entryDate] || 0;
                                    // Debugging: Log the values being compared
                                    console.log(`Comparing entryDate: ${entryDate}, sum: ${sum}, count: ${count}`);
                                    // Compare the sum with the count
                                    const matches = sum === count;
                                    // Push the comparison result to the results array
                                    comparisonResults.push({
                                        entryDate: entryDate,
                                        matches: matches
                                    });
                                }
                            });

                            // Output the comparison results
                            console.log("Võrdlemine", comparisonResults);

                            // Inside fetchData, after fetching and processing journal and lesson data
                            compareMAHTValuesAndInjectIfNeeded(journalId, journalCounts, insertedData);


                        } else {
                            console.log(`Journal ID ${journalId} not found in journalCounts.`);
                        }
                    }
                } else {
                    console.log('Journal data is not in the expected format');
                }
            } catch (error) {
                console.error('Error fetching journal data:', error);
            }
            // <--
        }

        // Function to count "MAHT_i" and "MAHT_a" values grouped by journal id
        function countHoursByJournalId(data: any): { [key: number]: { MAHT_i: number, MAHT_a: number } } {
            const journalHoursSummary: { [key: number]: { MAHT_i: number, MAHT_a: number } } = {};

            if (!data.journals || !Array.isArray(data.journals)) {
                console.log('Journal data is not in the expected format or missing journals');
                return journalHoursSummary;
            }

            data.journals.forEach((journal: any) => {
                const journalId = journal.id;
                const MAHT_iHours = journal.hours?.MAHT_i ?? [];
                const MAHT_aHours = journal.hours?.MAHT_a ?? [];

                // Sum "MAHT_i"
                const sumMAHT_i = MAHT_iHours.reduce((acc: number, current: number | null) => acc + (current ?? 0), 0);

                // Sum "MAHT_a"
                const sumMAHT_a = MAHT_aHours.reduce((acc: number, current: number | null) => acc + (current ?? 0), 0);

                journalHoursSummary[journalId] = { MAHT_i: sumMAHT_i, MAHT_a: sumMAHT_a };
            });

            return journalHoursSummary;
        }

    } catch (error) {
        console.error('There was a problem fetching the data:', error);
    }
}

// Encapsulated comparison and conditional injection function
async function compareMAHTValuesAndInjectIfNeeded(journalId, journalCounts, insertedData) {
    if (!journalCounts[journalId]) {
        console.log(`No journal counts found for journal ID ${journalId}.`);
        return;
    }

    const { MAHT_i: journalCountI, MAHT_a: journalCountA } = journalCounts[journalId];
    let sumSISSEKANNE_I = 0;
    let sumSISSEKANNE_T = 0;

    // Sum lessons based on entryType
    insertedData.content.forEach(entry => {
        const { entryType, lessons } = entry;
        if (entryType === 'SISSEKANNE_I') {
            sumSISSEKANNE_I += lessons;
        } else if (entryType === 'SISSEKANNE_T') {
            sumSISSEKANNE_T += lessons;
        }
    });

    // Compare MAHT_i with sumSISSEKANNE_I
    if (journalCountI !== sumSISSEKANNE_I) {
        console.log(`Journal ID ${journalId} MAHT_i does not match. Expected: ${journalCountI}, Actual: ${sumSISSEKANNE_I}`);
        injectSvelteComponent(journalId);
    } else {
        console.log(`Journal ID ${journalId} MAHT_i matches: ${journalCountI}`);
    }

    // Compare MAHT_a with sumSISSEKANNE_T
    if (journalCountA !== sumSISSEKANNE_T) {
        console.log(`Journal ID ${journalId} MAHT_a does not match. Expected: ${journalCountA}, Actual: ${sumSISSEKANNE_T}`);
        injectSvelteComponent(journalId);
    } else {
        console.log(`Journal ID ${journalId} MAHT_a matches: ${journalCountA}`);
    }
}

// Modified version of the injectSvelteComponent function to inject the Svelte component and store information about the injection
function injectSvelteComponent(journalId) {
    const anchorElement = document.querySelector(`a[href="/#/journal/${journalId}/edit"]`);
    const existingSpan = document.querySelector(`span[data-journal-id="${journalId}"]`);

    if (!existingSpan) {
        if (anchorElement) {
            const container = document.createElement('span');
            container.setAttribute('data-injected', 'true');
            container.setAttribute('data-journal-id', journalId); // Add journal ID attribute
            container.setAttribute('id', `injected-span-${journalId}`); // Add unique ID
            anchorElement.parentNode.insertBefore(container, anchorElement.nextSibling);

            // Assume TableComponent is imported at the top of your file
            new TableComponent({
                target: container,
                props: {
                    journalId: journalId
                },
            });

            // Store information about the injection in localStorage
            const injectedComponents = JSON.parse(localStorage.getItem('injectedComponents')) || {};
            injectedComponents[journalId] = true;
            localStorage.setItem('injectedComponents', JSON.stringify(injectedComponents));
        } else {
            console.log(`Anchor element not found for journal ID ${journalId}.`);
        }
    } else {
        console.log(`Span element already exists for journal ID ${journalId}.`);
    }
}

function observePageChanges() {
    window.onload = function () {
        // Override history.pushState method to listen for changes
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            checkPageAndInjectIfNeeded();
        };

        // Listen for popstate event
        window.addEventListener('popstate', checkPageAndInjectIfNeeded);

        // Check if the current page is the target and if the component needs to be injected
        function checkPageAndInjectIfNeeded() {
            const isTargetPage = window.location.href.includes('#/journals?_menu');
            if (isTargetPage) {
                console.log('User is on the target page. Check and inject component if needed.');
                // Inject the component
                injectComponentIfNeeded();
            }
        }

        // Initial check in case the page is loaded directly on the target URL
        checkPageAndInjectIfNeeded();
    };
}

function injectComponentIfNeeded() {
    // Find all anchor elements that match the pattern
    const anchorElements = document.querySelectorAll('a[ng-if="row.canEdit"]');

    // Loop through each anchor element
    anchorElements.forEach(anchorElement => {
        // Create the span element
        const spanElement = document.createElement('span');
        spanElement.style.borderRadius = '4px';
        spanElement.style.color = 'white';
        spanElement.style.backgroundColor = 'red';
        spanElement.style.padding = '4px';
        spanElement.style.marginLeft = '5px';
        spanElement.textContent = '!!!';

        // Inject the span element after the anchor element
        anchorElement.parentNode.insertBefore(spanElement, anchorElement.nextSibling);
    });
}

// Call observePageChanges to start observing page changes
observePageChanges();



// Function to initialize the application
function init() {
    console.log("Initial setup...");
    setupActionListener();
    fetchData();
    observePageChanges(); // Start observing changes to re-inject components as needed
}

init(); // Initialize the application
