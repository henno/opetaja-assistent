import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://test.tahvel.eenet.ee/*", "https://tahvel.edu.ee/*"],
    all_frames: true,
}

// console.log("Hello Tahvli kasutaja!")

console.log('tahvel.ts is executed.');
import './tahvel/tahvelApi';
