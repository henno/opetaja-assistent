export interface apiTimetableEntry {
    id: number;
    journalId: number;
    nameEt: string;
    date: string;
    timeStart: string;
    timeEnd: string;
}

export interface apiJournalEntry {
    entryDate: string;
    nameEt: string;
    entryType: string;
    lessons: number;
    startLessonNr: number;
    id: number;
}

export interface TahvelStudyYear {
    id: number;
    startDate: string;
    endDate: string;
}

export interface apiStudentEntry {
    studentId: number;
    fullname: string;
    status: string;
}

export interface apiCurriculumModuleEntry {
    journalId: number;
    nameEt: string;
    curriculumModuleOutcomes: number;
    entryType: string;
    studentOutcomeResults: apiGradeEntry[];
}

export interface apiGradeEntry {
    studentId: number;
}
