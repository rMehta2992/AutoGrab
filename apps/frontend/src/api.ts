import {
  isSubmissionResult,
  isVehicleCatalog,
  type SubmissionResult,
  type VehicleCatalog,
} from "./types";

async function readJsonPayload(
  response: Response,
  invalidResponseMessage: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(invalidResponseMessage);
    }

    throw error;
  }
}

export async function fetchVehicles(
  signal: AbortSignal,
): Promise<VehicleCatalog> {
  const response = await fetch("/api/vehicles", { signal });
  if (!response.ok) {
    throw new Error(`Could not load vehicle options (${response.status}).`);
  }

  const payload = await readJsonPayload(
    response,
    "The server returned invalid vehicle options.",
  );
  if (!isVehicleCatalog(payload)) {
    throw new Error("The server returned invalid vehicle options.");
  }

  return payload;
}

export async function submitLogbook(
  submission: {
    make: string;
    model: string;
    badge: string;
    logbook: File;
  },
): Promise<SubmissionResult> {
  const formData = new FormData();
  formData.set("make", submission.make);
  formData.set("model", submission.model);
  formData.set("badge", submission.badge);
  formData.set("logbook", submission.logbook);

  const response = await fetch("/api/submissions", {
    method: "POST",
    body: formData,
  });
  const payload = await readJsonPayload(
    response,
    response.ok
      ? "The server returned an invalid submission response."
      : `Submission failed (${response.status}).`,
  );

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Submission failed (${response.status}).`;
    throw new Error(message);
  }

  if (!isSubmissionResult(payload)) {
    throw new Error("The server returned an invalid submission response.");
  }

  return payload;
}
