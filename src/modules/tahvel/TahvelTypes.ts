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
    journalStudentResults: apiJournalStudentEntry[];
}

export interface apiStudentEntry {
    id: number;
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
    outcomeOrderNr: number;
    curriculumModuleOutcomes: number;
    entryType: string;
    studentOutcomeResults: apiStudentOutcomeEntry[];
}

export interface apiStudentOutcomeEntry {
    studentId: number;
    grade:  apiGradeEntryGrade
}

export interface apiJournalStudentEntry {
    journalStudentId: number;
    grade:  apiGradeEntryGrade
}

export interface apiGradeEntryGrade {
    code: string;
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

