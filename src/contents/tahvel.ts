import type {PlasmoCSConfig} from "plasmo"
import Tahvel from '~src/modules/tahvel';

// Define URLs
export const config: PlasmoCSConfig = {
    matches: ["https://test.tahvel.eenet.ee/*", "https://tahvel.edu.ee/*"],
    exclude_matches: [
        "https://tahvel.edu.ee/hois_back/*"
    ],
    all_frames: true,
}

Tahvel.init().catch(error => Tahvel.handleError(error));
