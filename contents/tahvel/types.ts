export interface EntryInTimetable {
    id: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    number?: number; // Add the number property
}

export interface EntryInJournal {
    entryDate: string;
    nameEt: string;
    entryType: string;
    startLessonNr: number | null;
    lessons: number;
    id: number;
}

export interface Journal {
    id: number;
    nameEt: string;
    entriesInTimetable: EntryInTimetable[];
    entriesInJournal: EntryInJournal[];
}

export interface LessonTime {
    number: number;
    timeStart: string;
    timeEnd: string;
    note?: string;
}

export interface Database {
    journals: Journal[];
    lessonTimes: LessonTime[];
}

export interface TimetableEventApiResponse {
    id: number;
    journalId: number;
    nameEt: string;
    date: string;
    timeStart: string;
    timeEnd: string;
}

export interface TimetableByTeacherResponse {
    timetableEvents: TimetableEventApiResponse[];
}

export interface JournalEntryApiResponse {
    entryDate: string;
    nameEt: string;
    entryType: string;
    startLessonNr: number | null;
    lessons: number;
    id: number;
}