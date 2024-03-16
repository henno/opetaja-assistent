export interface Database {
    journals: Journal[];
    lessonTimes: LessonTime[];
}

export interface Journal {
    id: number;
    nameEt: string;
    hasDiscrepancy: boolean;
    entriesInTimetable: EntryInTimetable[];
    entriesInJournal: EntryInJournal[];
    differences: Difference[];
}

export interface EntryInTimetable {
    // count: any;
    id: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    number?: number;
}

export interface EntryInJournal {
    entryDate: string;
    nameEt: string;
    entryType: string;
    lessons: number;
    lessonNumbers?: string;
    id: number;
}

export interface LessonTime {
    number: number;
    timeStart: string;
    timeEnd: string;
    note?: string;
}

export interface TimetableByTeacherResponse {
    timetableEvents: TimetableEventApiResponse[];
}

export interface TimetableEventApiResponse {
    id: number;
    journalId: number;
    nameEt: string;
    date: string;
    timeStart: string;
    timeEnd: string;
}

export interface JournalEntryApiResponse {
    entryDate: string;
    nameEt: string;
    entryType: string;
    lessons: number;
    id: number;
}

export interface Difference {
    date: string;
    mismatch: boolean;
    missing_E: boolean;
    missing_J: boolean;
    startLessonNr: number;
    timetableCount: number;
    lessonsInJournal: number;
}