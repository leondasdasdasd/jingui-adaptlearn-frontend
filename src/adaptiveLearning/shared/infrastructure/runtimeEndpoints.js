import { createRuntimeEndpoints } from "./runtimeEndpointFactory.js";

const runtimeEnv = import.meta.env || {};

const runtimeEndpoints = createRuntimeEndpoints(runtimeEnv);

export const adaptiveApiUrl = runtimeEndpoints.adaptiveApiUrl;
export const classroomApiUrl = runtimeEndpoints.classroomApiUrl;
