import Api from "~src/shared/AssistentApiClient";
import type {TahvelStudyYear} from "./TahvelTypes";
import TahvelUser from "~src/modules/tahvel/TahvelUser";

class StudyYear {
    static years: TahvelStudyYear[] | null = null;
    static minDate: string | null = null;
    static maxDate: string | null = null;

    static async init(): Promise<TahvelStudyYear[]> {

        const timetableStudyYears = await Api.get(`/timetables/timetableStudyYears/${TahvelUser.schoolId}`);

        // Reject promise if there are no study years
        if (timetableStudyYears.length === 0) {
            return Promise.reject('No study years found.');
        }

        this.years = timetableStudyYears;

        // Find min and max dates from all study years
        //StudyYear.minDate = "2023-07-31T00:00:00Z"; // For testing
        StudyYear.minDate = this.years.reduce((min, y) => y.startDate < min ? y.startDate : min, this.years[1].startDate);
        StudyYear.maxDate = this.years.reduce((max, y) => y.endDate > max ? y.endDate : max, this.years[0].endDate);

    }

}

export default StudyYear;
