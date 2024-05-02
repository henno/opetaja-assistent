import Api from "~src/shared/AssistentApiClient";
import type {AssistantCurriculumModules} from "~src/shared/AssistentTypes";
import type {apiCurriculumModuleEntry, apiGradeEntry } from "./TahvelTypes";


class TahvelGrades {
    static async fetchCurriculumModules(journalId: number): Promise<AssistantCurriculumModules[]> {
        const response: apiCurriculumModuleEntry[] = await Api.get(`/journals/${journalId}/journalEntriesByDate`);

        if (!response) {
            console.error("Error: Journal entries data is missing or in unexpected format");
            return;
        }

        return response
            .filter(entry => entry.entryType === 'SISSEKANNE_O' || entry.entryType === 'SISSEKANNE_L')
            .map(entry => ({
                journalId: journalId,
                nameEt: entry.nameEt,
                curriculumModuleOutcomes: entry.curriculumModuleOutcomes,
                entryType: entry.entryType,
                studentOutcomeResults: Object.values(entry.studentOutcomeResults || {}).map((result: apiGradeEntry) => ({
                    studentId: result.studentId,
                }))
            }));
    }
}

export default TahvelGrades;