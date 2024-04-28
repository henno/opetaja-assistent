import type {PlasmoCSConfig} from "plasmo"

// Define URLs
export const config: PlasmoCSConfig = {
    matches: ["https://test.tahvel.eenet.ee/*", "https://tahvel.edu.ee/*"],
    exclude_matches: [
        "https://tahvel.edu.ee/hois_back/*"
    ],
    all_frames: true,
}

import Tahvel from '~src/modules/tahvel';

Tahvel.init()
