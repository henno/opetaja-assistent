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

export interface Student {
    id: number;
    studentId: string;
    fullname: string;
    status: string;
}

export interface Grade {
    forEach(arg0: (grade: any) => void): unknown;
    id: number;
    code: string;
}

export interface StudentOutcomeResult  {
    curriculumModuleOutcomes: number;
    nameEt: string;
    studentId: string;
    grades: Grade;
}

export interface Journal {
    id: number;
    nameEt: string;
    entriesInTimetable: EntryInTimetable[];
    entriesInJournal: EntryInJournal[];
    students: Student[];
    studentOutcomeResults: StudentOutcomeResult[];
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
