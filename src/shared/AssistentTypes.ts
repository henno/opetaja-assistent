export interface AssistentJournal {
    id: number;
    nameEt: string;
    entriesInTimetable: AssistentTimetableEntry[];
    entriesInJournal: AssistentJournalEntry[];
    differencesToTimetable: AssistentJournalDifference[];
    students: AssistentStudent[];
    learningOutcomes: AssistentLearningOutcomes[];
    missingGrades: StudentsWithoutGrades[];
    independentWorkPlanned: number;
    independentWorkGiven: number;
    contactLessonsPlanned: number;
    contactLessonsGiven: number;
    gradingType: string;
    lessonMissing: boolean;
    lessonDiscrepancies: boolean;
}

export interface AssistentStudent {
    studentId: number;
    fullname: string;
    status: string;
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

export interface AssistentLearningOutcomes {
    nameEt: string,
    studentOutcomeResults: StudentOutcomeResults[]
}

export interface StudentOutcomeResults {
    studentId: number,
}

export interface StudentsWithoutGrades {
    nameEt: string,
    studentList: student[]
}

export interface student {
    studentId: number,
    fullname: string
}
