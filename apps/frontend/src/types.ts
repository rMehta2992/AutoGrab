export type VehicleCatalog = Record<string, Record<string, string[]>>;

export type SubmissionResult = {
  make: string;
  model: string;
  badge: string;
  logbookContents: string;
};

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function isSubmissionResult(
  value: unknown,
): value is SubmissionResult {
  return (
    isStringRecord(value) &&
    typeof value.make === "string" &&
    typeof value.model === "string" &&
    typeof value.badge === "string" &&
    typeof value.logbookContents === "string"
  );
}

export function isVehicleCatalog(value: unknown): value is VehicleCatalog {
  if (!isStringRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (models) =>
      isStringRecord(models) &&
      Object.values(models).every(
        (badges) =>
          Array.isArray(badges) &&
          badges.every((badge) => typeof badge === "string"),
      ),
  );
}
