export interface AssistentJournal {
    id: number;
    nameEt: string;
    entriesInTimetable: AssistentTimetableEntry[];
    entriesInJournal: AssistentJournalEntry[];
    differencesToTimetable: AssistentJournalDifference[];
}

export interface AssistentJournalDifference {
    date: string;
    lessonType: LessonType;
    timetableLessonCount: number;
    timetableFirstLessonStartNumber: number;
    journalLessonCount: number;
    journalFirstLessonStartNumber: number;
    journalEntryId: number;
}

export interface AssistentTimetableEntry {
    id: number;
    name: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    firstLessonStartNumber: number;
    journalId: number;
}

export interface AssistentJournalEntry {
    id: number;
    date: string;
    name: string;
    lessonType: LessonType
    lessonCount: number;
    firstLessonStartNumber: number;
}

export interface AssistentLessonTime {
    number: number;
    timeStart: string;
    timeEnd: string;
    note?: string;
}

export enum LessonType {
    IndependentWork,
    Lesson,
    Other
}
