export interface AssistentJournal {
    id: number;
    name: string;
    entriesInTimetable: AssistentTimetableEntry[];
    entriesInJournal: AssistentJournalEntry[];
    differencesToTimetable: AssistentJournalDifference[];
    students: AssistentStudent[];
    learningOutcomes: AssistentLearningOutcomes[];
    missingGrades: AssistentStudentsWithoutGrades[];
    independentWorkPlanned: number;
    independentWorkGiven: number;
    contactLessonsPlanned: number;
    contactLessonsGiven: number;
    gradingType: AssistentGradingType;
    lessonMissing: boolean;
    lessonDiscrepancies: boolean;
}

export enum AssistentGradingType {
    numeric = 'numeric',
    passFail = 'passFail',
}

export interface AssistentStudent {
    studentId: number;
    name: string;
    status: AssistentStudentStatus;
}

export enum AssistentStudentStatus {
    active = 'active',
    academicLeave = 'academicLeave',
    exmatriculated = "exmatriculated",
    individualCurriculum = "individualCurriculum",
    finished = "finished"
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
    independentWork = 'independentWork',
    lesson = 'lesson',
    other = 'other'
}

export interface AssistentLearningOutcomes {
    name: string,
    studentOutcomeResults: AssistentStudentOutcomeResults[]
}

export interface AssistentStudentOutcomeResults {
    studentId: number,
}

export interface AssistentStudentsWithoutGrades {
    name: string,
    studentList: AssistentStudent[]
}

