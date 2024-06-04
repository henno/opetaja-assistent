import {
    type AssistentJournal,
    type AssistentJournalDifference,
    type AssistentLessonTime, AssistentStudentStatus, type AssistentStudentsWithoutGrades
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
            if (journalEntry.lessonType !== LessonType.lesson) {
                continue; // Skip entries with lessonType other than lesson
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
                    lessonType: LessonType.lesson,
                    timetableLessonCount: lessonCounts[date].timetable,
                    timetableFirstLessonStartNumber: firstLessonStartNumbers[date].timetable,
                    journalLessonCount: lessonCounts[date].journal,
                    journalFirstLessonStartNumber: firstLessonStartNumbers[date].journal,
                    // Find the journal entry id for the date and where lessonType is lesson
                    journalEntryId: journal.entriesInJournal.find(j => j.date === date && j.lessonType === LessonType.lesson)?.id || 0
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

    // compare studentOutcomeResults and students for each curriculumModuleOutcome and for each journal
    static findCurriculumModuleOutcomeDiscrepancies(journalId: number): void {
        const journal = AssistentCache.getJournal(journalId);
        const missingGrades: AssistentStudentsWithoutGrades[] = [];

        if (!journal) return;

        // If contact lessons count in timetable are equal or greater than contact lessons planned, then add data into cache
        if (journal.entriesInTimetable.length >= journal.contactLessonsPlanned) {
            // iterate over curriculumModules and find the discrepancies of studentOutcomeResults and students
            for (const curriculumModule of journal.learningOutcomes) {
                const missingGradesForModule: AssistentStudentsWithoutGrades = {
                    name: curriculumModule.name,
                    code: curriculumModule.code,
                    studentList: []
                };

                for (const student of journal.students) {
                    // Check if student's status is active before calculating missing grades
                    if (student.status === AssistentStudentStatus.active && !curriculumModule.studentOutcomeResults.find(result => result.studentId === student.studentId)) {
                        missingGradesForModule.studentList.push(student);
                    }
                }

                if (missingGradesForModule.studentList.length > 0) {
                    missingGrades.push(missingGradesForModule);
                }
            }
            journal.missingGrades = missingGrades;
        }

    }

    static findJournalLessonsDifferencesFact(id: number) {
        // if differencesToTimetable length > 0 and differencesToTimetable.journalLessonCount === 0, then set lessonMissing to true
        const journal = AssistentCache.getJournal(id);
        if (journal && journal.differencesToTimetable.length > 0 && journal.differencesToTimetable.find(difference => difference.journalLessonCount === 0)) {
            journal.lessonMissing = true;
        }

        // if ((differencesToTimetable.timetableFirstLessonStartNumber <> differencesToTimetable.journalFirstLessonStartNumber) or (differencesToTimetable.journalLessonCount <> differencesToTimetable.timetableLessonCount)) or (differencesToTimetable.journalLessonCount > 0 and differencesToTimetable.timetableLessonCount = 0)
        // then set lessonDiscrepancies to true
        if (journal && journal.differencesToTimetable.length > 0 && journal.differencesToTimetable.find(difference =>
            ((difference.timetableLessonCount > 0
                    && difference.journalLessonCount > 0
                    && (difference.timetableLessonCount !== difference.journalLessonCount || difference.timetableFirstLessonStartNumber !== difference.journalFirstLessonStartNumber))
                || (difference.journalLessonCount > 0 && difference.timetableLessonCount === 0)))) {
            journal.lessonDiscrepancies = true;
        }
    }

    static updateJournal(journal: AssistentJournal) {
        const existingJournal = AssistentCache.journals.find(j => j.id === journal.id);
        if (existingJournal) {
            Object.assign(existingJournal, journal);
        } else {
            AssistentCache.journals.push(journal);
        }

    }
}

export default AssistentCache;
console.log('AssistentCache', AssistentCache.journals);
