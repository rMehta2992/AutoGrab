import { useEffect, useState, type FormEvent } from "react";
import { isSubmissionResult, type VehicleCatalog } from "./types";
import { fetchVehicles, submitLogbook } from "./api";
import UploadResult from "./UploadResult";

const quickSelections = [
  {
    label: "Tesla Model 3 Performance",
    make: "Tesla",
    model: "Model 3",
    badge: "Performance",
  },
  {
    label: "BMW 130d xDrive 26d",
    make: "BMW",
    model: "130d",
    badge: "xDrive 26d",
  },
] as const;

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [catalog, setCatalog] = useState<VehicleCatalog>();
  const [loadError, setLoadError] = useState<string>();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [badge, setBadge] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [logbook, setLogbook] = useState<File>();
  const [submission, setSubmission] = useState(() => getHistorySubmission());
  const [submissionError, setSubmissionError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchVehicles(controller.signal)
      .then(setCatalog)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load vehicle options.",
          );
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
      setSubmission(getHistorySubmission());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const makes = catalog ? Object.keys(catalog) : [];
  const models = catalog?.[make] ? Object.keys(catalog[make]) : [];
  const badges = catalog?.[make]?.[model] ?? [];
  const loading = !catalog && !loadError;

  function selectQuickVehicle(
    selection: (typeof quickSelections)[number],
  ) {
    setMake(selection.make);
    setModel(selection.model);
    setBadge(selection.badge);
    clearSubmissionState();
  }

  function clearSubmissionState() {
    setLogbook(undefined);
    setSubmissionError(undefined);
    setFileInputKey((key) => key + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logbook || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmissionError(undefined);

    try {
      const result = await submitLogbook({ make, model, badge, logbook });
      window.history.pushState({ submission: result }, "", "/upload");
      setSubmission(result);
      setCurrentPath("/upload");
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Could not submit the logbook.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="form-page" hidden={currentPath === "/upload"}>
        <h1>Drill Down Form</h1>

        {loading && <p role="status">Loading vehicle options…</p>}
        {loadError && <p role="alert">{loadError}</p>}

        <form className="vehicle-form" onSubmit={handleSubmit}>
          <label className="make-control">
            <span className="visually-hidden">Make</span>
            <select
              name="make"
              value={make}
              disabled={!catalog || submitting}
              onChange={(event) => {
                setMake(event.target.value);
                setModel("");
                setBadge("");
                clearSubmissionState();
              }}
            >
              <option value="">make</option>
              {makes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {make && (
            <div className="vehicle-fields">
              <label>
                <span className="visually-hidden">Model</span>
                <select
                  name="model"
                  value={model}
                  disabled={!make || submitting}
                  onChange={(event) => {
                    setModel(event.target.value);
                    setBadge("");
                    clearSubmissionState();
                  }}
                >
                  <option value="">model</option>
                  {models.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {model && (
                <label>
                  <span className="visually-hidden">Badge</span>
                  <select
                    name="badge"
                    value={badge}
                    disabled={submitting}
                    onChange={(event) => {
                      setBadge(event.target.value);
                      clearSubmissionState();
                    }}
                  >
                    <option value="">badge</option>
                    {badges.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {badge && (
                <section
                  className="upload-section"
                  aria-labelledby="upload-logbook-heading"
                >
                  <h2 id="upload-logbook-heading">Upload Logbook:</h2>
                  <input
                    key={fileInputKey}
                    name="logbook"
                    type="file"
                    accept=".txt,text/plain"
                    disabled={submitting}
                    required
                    aria-label="Upload Logbook"
                    onChange={(event) => {
                      setLogbook(event.target.files?.[0]);
                      setSubmissionError(undefined);
                    }}
                  />

                  <button type="submit" disabled={!logbook || submitting}>
                    {submitting ? "Uploading…" : "Submit"}
                  </button>
                </section>
              )}
            </div>
          )}
        </form>

        <section
          className="vehicle-picker"
          aria-labelledby="vehicle-picker-heading"
        >
          <h2 id="vehicle-picker-heading">Select a Vehicle</h2>
          <div className="quick-selections">
            {quickSelections.map((selection) => {
              const isAvailable =
                catalog?.[selection.make]?.[selection.model]?.includes(
                  selection.badge,
                ) ?? false;

              return (
                <button
                  key={selection.label}
                  type="button"
                  disabled={!isAvailable || submitting}
                  onClick={() => selectQuickVehicle(selection)}
                >
                  {selection.label}
                </button>
              );
            })}
          </div>
        </section>

        {submitting && <p role="status">Uploading logbook…</p>}
        {submissionError && <p role="alert">{submissionError}</p>}
      </main>
      {currentPath === "/upload" && <UploadResult result={submission} />}
    </>
  );
}

function getHistorySubmission() {
  const state: unknown = window.history.state;
  if (
    typeof state === "object" &&
    state !== null &&
    "submission" in state &&
    isSubmissionResult(state.submission)
  ) {
    return state.submission;
  }

  return undefined;
}
