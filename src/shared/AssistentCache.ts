import type {
    AssistentJournal,
    AssistentJournalDifference,
    AssistentJournalEntry,
    AssistentLessonTime
} from "~src/shared/AssistentTypes";
import {LessonType} from "~src/shared/AssistentTypes";

export class AssistentCache {

    public static journals: AssistentJournal[] = [];
    public static lessonTimes: AssistentLessonTime[] = [];

    /**
     * Find lessons in timetable entries that are missing in journal entries. This function takes into account that the lessons in journal may be
     * @param journalId
     */
    public static findJournalDiscrepancies(journalId: number): AssistentJournal | [] {
        const journal = AssistentCache.getJournal(journalId);

        if (!journal) return [];

        const lessonCounts: Record<string, { journal: number, timetable: number }> = {};
        const firstLessonStartNumbers: Record<string, { journal: number, timetable: number }> = {};
        const differences: AssistentJournalDifference[] = [];

        for (const journalEntry of journal.entriesInJournal) {
            if (journalEntry.lessonType !== LessonType.Lesson) {
                continue; // Skip entries with lessonType other than Lesson
            }
            if (!firstLessonStartNumbers[journalEntry.date]) {
                firstLessonStartNumbers[journalEntry.date] = {journal: Infinity, timetable: Infinity};
            }
            if (!lessonCounts[journalEntry.date]) {
                lessonCounts[journalEntry.date] = {journal: 0, timetable: 0};
            }
            lessonCounts[journalEntry.date].journal += journalEntry.lessonCount;
            if (journalEntry.firstLessonStartNumber < firstLessonStartNumbers[journalEntry.date].journal) {
                firstLessonStartNumbers[journalEntry.date].journal = journalEntry.firstLessonStartNumber;
            }
        }

        for (const timetableEntry of journal.entriesInTimetable) {
            if (!firstLessonStartNumbers[timetableEntry.date]) {
                firstLessonStartNumbers[timetableEntry.date] = {journal: Infinity, timetable: Infinity};
            }
            if (!lessonCounts[timetableEntry.date]) {
                lessonCounts[timetableEntry.date] = {journal: 0, timetable: 0};
            }

            if (timetableEntry.firstLessonStartNumber < firstLessonStartNumbers[timetableEntry.date].timetable) {
                firstLessonStartNumbers[timetableEntry.date].timetable = timetableEntry.firstLessonStartNumber;
            }

            lessonCounts[timetableEntry.date].timetable++;
        }

        for (const date in lessonCounts) {
            if (date !== 'null' && (lessonCounts[date].journal !== lessonCounts[date].timetable
                || firstLessonStartNumbers[date].journal !== firstLessonStartNumbers[date].timetable)) {
                differences.push({
                    date: date,
                    lessonType: LessonType.Lesson,
                    timetableLessonCount: lessonCounts[date].timetable,
                    timetableFirstLessonStartNumber: firstLessonStartNumbers[date].timetable,
                    journalLessonCount: lessonCounts[date].journal,
                    journalFirstLessonStartNumber: firstLessonStartNumbers[date].journal,
                    // Find the journal entry id for the date and where lessonType = 1
                    journalEntryId: journal.entriesInJournal.find(j => j.date === date && j.lessonType === LessonType.Lesson)?.id || 0
                });
            }
        }

        // Replacing Infinity with 0
        differences.forEach(difference => {
            if (difference.timetableFirstLessonStartNumber === Infinity) {
                difference.timetableFirstLessonStartNumber = 0;
            }
            if (difference.journalFirstLessonStartNumber === Infinity) {
                difference.journalFirstLessonStartNumber = 0;
            }
        });

        journal.differencesToTimetable = differences;
    }

    static getJournal(journalId: number): AssistentJournal | undefined {
        return AssistentCache.journals.find(j => j.id === journalId);
    }

}

export default AssistentCache;
