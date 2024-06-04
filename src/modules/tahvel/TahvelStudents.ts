import Api from "~src/shared/AssistentApiClient";
import {type apiStudentEntry, apiStudentStatus} from "~src/modules/tahvel/TahvelTypes";
import {type AssistentStudent, AssistentStudentStatus} from "~src/shared/AssistentTypes";

class TahvelStudents {
    static async fetchEntries(journalId: number): Promise<AssistentStudent[]> {
        let response: apiStudentEntry[];
        try {
            response = await Api.get(`/journals/${journalId}/journalStudents`);
        } catch (e) {
            // If 412 then we don't have permission to read this particular journal and we should just skip it
            if (e.statusCode === 412) {
                return [];
            }
        }
        return response.map(({studentId, fullname, status}) => ({
            studentId,
            name: fullname,
            status: this.mapStatus(status)
        }));
    }

    static mapStatus(status: apiStudentStatus): AssistentStudentStatus {

        const statusMap: Record<apiStudentStatus, AssistentStudentStatus> = {
            [apiStudentStatus.active]: AssistentStudentStatus.active,
            [apiStudentStatus.academicLeave]: AssistentStudentStatus.academicLeave,
            [apiStudentStatus.exmatriculated]: AssistentStudentStatus.exmatriculated,
            [apiStudentStatus.individualCurriculum]: AssistentStudentStatus.individualCurriculum,
            [apiStudentStatus.finished]: AssistentStudentStatus.finished,
        };

        if (!(status in statusMap)) {
            throw new Error(`Unknown status: ${status}`);
        }

        return statusMap[status];
    }
}

export default TahvelStudents;
