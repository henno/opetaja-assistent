
import Api from "~src/shared/AssistentApiClient";
import type { AssistentStudent } from "~src/shared/AssistentTypes";
import type { apiStudentEntry } from "./TahvelTypes";

class TahvelStudents {
    static async fetchEntries(journalId: number): Promise<AssistentStudent[]> {
        try {
            const response: apiStudentEntry[] = await Api.get(`/journals/${journalId}/journalStudents`);

            // Transform the data to AssistentStudent type
            return response.reduce((acc: AssistentStudent[], student: apiStudentEntry) => {
                acc.push({
                    studentId: student.studentId,
                    fullname: student.fullname,
                    status: student.status
                });
                return acc;
            }, []);



        } catch (error) {
            console.error("Error fetching student entries:", error);
            throw error; // Rethrow error for upper layers to handle
        }
    }
}

export default TahvelStudents;