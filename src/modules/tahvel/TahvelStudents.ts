import Api from "~src/shared/AssistentApiClient";
import {type AssistentStudent, AssistentStudentStatus} from "~src/shared/AssistentTypes";
import {type apiStudentEntry, apiStudentStatus} from "./TahvelTypes";

class TahvelStudents {

    private static statusMap: Record<string, AssistentStudentStatus> = {
        [apiStudentStatus.active]: AssistentStudentStatus.active,
        [apiStudentStatus.academicLeave]: AssistentStudentStatus.academicLeave,
    };

    static async fetchEntries(journalId: number): Promise<AssistentStudent[]> {
        try {
            const response: apiStudentEntry[] = await Api.get(`/journals/${journalId}/journalStudents`);
            return response.map(({studentId, fullname, status}) => ({
                studentId,
                name: fullname,
                status: TahvelStudents.convertStudentStatusFromTahvelToAssistent(status),
            }));
        } catch (error) {
            console.error("Error fetching student entries:", error);
            throw error;
        }
    }

    private static convertStudentStatusFromTahvelToAssistent(value: string): AssistentStudentStatus {
        const status = TahvelStudents.statusMap[value];
        if (!status) throw new Error(`Invalid student status: ${value}`);
        return status;
    }
}

export default TahvelStudents;
