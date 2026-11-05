import type { SubmissionResult } from "./types";

export default function UploadResult({
  result,
}: {
  result: SubmissionResult | undefined;
}) {
  if (!result) {
    return (
      <main className="upload-result-page">
        <p role="alert">
          No upload result is available. Submit a logbook from the form.
        </p>
      </main>
    );
  }

  const resultText = `Make: ${result.make}\nModel: ${result.model}\nBadge: ${result.badge}\n\nLogbook:\n\n${result.logbookContents}`;

  return (
    <main className="upload-result-page">
      <p role="status">Upload successful — there is no spoon.</p>
      <pre>{resultText}</pre>
    </main>
  );
}
