import Api from "~src/shared/AssistentApiClient";
import StudyYear from "~src/modules/tahvel/TahvelStudyYear";
import type {AssistentTimetableEntry} from "~src/shared/AssistentTypes";
import AssistentCache from "~src/shared/AssistentCache";
import type {apiTimetableEntry} from "~src/modules/tahvel/TahvelTypes";
import TahvelUser from "~src/modules/tahvel/TahvelUser";

class TahvelTimetable {

    /** Fetches timetable entries from the API */
    static async fetchEntries(): Promise<AssistentTimetableEntry[]> {
        const response = await Api.get(`/timetableevents/timetableByTeacher/${TahvelUser.schoolId}?from=${StudyYear.minDate}&lang=ET&teachers=${TahvelUser.teacherId}&thru=${StudyYear.maxDate}`);
        if (!response || !response.timetableEvents) {
            console.error("Error: Timetable events data is missing or in unexpected format");
            return;
        }

        // Filter out events without journalId and transform the data to AssistentTimetableEntry type
        return response.timetableEvents.reduce((acc: AssistentTimetableEntry[], event: apiTimetableEntry) => {
            if (event.journalId !== null) {
                acc.push({
                    id: event.id,
                    name: event.nameEt,
                    date: event.date,
                    timeStart: event.timeStart,
                    timeEnd: event.timeEnd,
                    firstLessonStartNumber: TahvelTimetable.calculateLessonNumber(event),
                    journalId: event.journalId
                });
            }
            return acc;
        }, []);
    }

    /** Calculates the lesson number based on the event time */
    static calculateLessonNumber(event: apiTimetableEntry) {

        // Since we don't care about the date, we can set it to a fixed date
        const eventTimeStart = new Date(`2021-01-01T${event.timeStart}`).getTime();
        const closestLessonTime = AssistentCache.lessonTimes.reduce((currentlyTheBest, lessonTime) => {
            const lessonTimeStart = new Date(`2021-01-01T${lessonTime.timeStart}`).getTime();
            const difference = Math.abs(lessonTimeStart - eventTimeStart);

            if (difference < currentlyTheBest.difference) {
                // If the current lesson time is closer to the event time than the previous best time, return the current lesson time
                return {difference, lessonTime};
            } else {
                // If the current lesson time is further away than the previous best time, return the previous best time
                return currentlyTheBest;
            }
        }, {difference: Infinity, lessonTime: null});

        return closestLessonTime.lessonTime.number;
    }
}

export default TahvelTimetable;
