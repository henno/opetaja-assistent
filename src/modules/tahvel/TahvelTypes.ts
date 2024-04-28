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
