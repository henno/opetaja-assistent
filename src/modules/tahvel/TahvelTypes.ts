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

export interface apiStudentEntry {
    studentId: number;
    fullname: string;
    status: apiStudentStatus;
}

export enum apiStudentStatus {
    active = 'OPPURSTAATUS_O',
    academicLeave = 'OPPURSTAATUS_A',
    exmatriculated = "OPPURSTAATUS_K",
    individualCurriculum = "OPPURSTAATUS_V",
    finished = "OPPURSTAATUS_L"
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

export interface apiJournalInfoEntry {
    id: number;
    lessonHours: apiLessonHours;
    assessment: apiAssessmentEntry;
}

export enum apiAssessmentEntry {
    numeric = 'KUTSEHINDAMISVIIS_E',
    passFail = 'KUTSEHINDAMISVIIS_M',
}

export interface apiLessonHours {
    capacityHours: apiCapacityHours[];
}

export interface apiCapacityHours {
    capacity: string;
    plannedHours: number;
    usedHours: number;
}

export interface TahvelStudyYear {
    id: number;
    startDate: string;
    endDate: string;
}
