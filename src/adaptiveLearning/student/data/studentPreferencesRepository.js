import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readJson,
  writeJson,
} from "../../shared/infrastructure/browserStorage.js";

/**
 *
 */
export function readAutoSpeechPreference() {
  return readJson(storageKeys.autoSpeech, false) === true;
}

/**
 *
 * @param enabled
 */
export function writeAutoSpeechPreference(enabled) {
  writeJson(storageKeys.autoSpeech, Boolean(enabled));
}
