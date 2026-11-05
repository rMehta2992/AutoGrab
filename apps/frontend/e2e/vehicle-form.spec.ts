import { expect, test } from "@playwright/test";

test("vehicle selections cascade, reset, and allow file selection", async ({
  page,
}) => {
  await page.goto("/");

  const make = page.getByRole("combobox", { name: "Make" });
  const model = page.getByRole("combobox", { name: "Model" });
  const badge = page.getByRole("combobox", { name: "Badge" });
  const logbook = page.locator('input[name="logbook"]');

  await expect(
    page.getByRole("heading", { name: "Drill Down Form" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Select a Vehicle" }),
  ).toBeVisible();
  await expect(make).toBeEnabled();
  await expect(make).toHaveValue("");
  await expect(model).toHaveCount(0);
  await expect(badge).toHaveCount(0);
  await expect(logbook).toHaveCount(0);

  await make.selectOption("Ford");
  await expect(model).toBeEnabled();
  await expect(model.locator("option")).toHaveText([
    "model",
    "Ranger",
    "Falcon",
    "Falcon Ute",
  ]);
  await model.selectOption("Ranger");
  await expect(badge).toBeVisible();
  await expect(badge.locator("option")).toHaveText([
    "badge",
    "Raptor",
    "Raptor X",
    "Wildtrak",
  ]);
  await badge.selectOption("Raptor");
  await expect(logbook).toBeVisible();
  const dropdownWidths = await Promise.all(
    [make, model, badge].map(async (dropdown) => {
      const bounds = await dropdown.boundingBox();
      if (!bounds) {
        throw new Error("Expected every vehicle dropdown to be visible.");
      }

      return bounds.width;
    }),
  );
  expect(new Set(dropdownWidths).size).toBe(1);

  await model.selectOption("Falcon");
  await expect(badge).toHaveValue("");
  await expect(logbook).toHaveCount(0);

  await badge.selectOption("XR6");
  await make.selectOption("BMW");
  await expect(model).toHaveValue("");
  await expect(badge).toHaveCount(0);

  await page.getByRole("button", { name: "BMW 130d xDrive 26d" }).click();
  await expect(make).toHaveValue("BMW");
  await expect(model).toHaveValue("130d");
  await expect(badge).toHaveValue("xDrive 26d");

  await page
    .getByRole("button", { name: "Tesla Model 3 Performance" })
    .click();
  await expect(make).toHaveValue("Tesla");
  await expect(model).toHaveValue("Model 3");
  await expect(badge).toHaveValue("Performance");
  await expect(logbook).toBeEnabled();

  const logbookContents = "Service performed: oil change.\n";
  await logbook.setInputFiles({
    name: "service-log.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(logbookContents),
  });

  const submissionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/submissions") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit" }).click();

  const response = await submissionResponse;
  await expect(page).toHaveURL(/\/upload$/);
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({
    make: "Tesla",
    model: "Model 3",
    badge: "Performance",
    logbookContents,
  });
  await expect(
    page.getByText("Upload successful — there is no spoon."),
  ).toBeVisible();
  await expect(page.locator("pre")).toHaveText(
    `Make: Tesla\nModel: Model 3\nBadge: Performance\n\nLogbook:\n\n${logbookContents}`,
  );
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(make).toHaveValue("Tesla");
  await expect(model).toHaveValue("Model 3");
  await expect(badge).toHaveValue("Performance");
  await expect(logbook).toBeVisible();
  await expect(logbook).toHaveValue(/service-log\.txt$/);
});

test("vehicle catalog failures are shown to the user", async ({ page }) => {
  await page.route("**/api/vehicles", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html>Bad gateway</html>",
    }),
  );

  await page.goto("/");

  await expect(page.getByRole("alert")).toHaveText(
    "Could not load vehicle options (502).",
  );
  await expect(
    page.getByRole("button", { name: "Tesla Model 3 Performance" }),
  ).toBeDisabled();
});

test("invalid JSON vehicle catalog responses are reported explicitly", async ({
  page,
}) => {
  await page.route("**/api/vehicles", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{",
    }),
  );

  await page.goto("/");

  await expect(page.getByRole("alert")).toHaveText(
    "The server returned invalid vehicle options.",
  );
  await expect(
    page.getByRole("button", { name: "Tesla Model 3 Performance" }),
  ).toBeDisabled();
});

test("non-JSON submission errors show a useful message without success state", async ({
  page,
}) => {
  await page.route("**/api/submissions", (route) =>
    route.fulfill({
      status: 500,
      contentType: "text/html",
      body: "<html>Internal server error</html>",
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "BMW 130d xDrive 26d" }).click();
  await page.locator('input[name="logbook"]').setInputFiles({
    name: "service-log.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Service performed."),
  });
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("alert")).toHaveText("Submission failed (500).");
  await expect(
    page.getByRole("heading", { name: "Submission result" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Upload successful — there is no spoon."),
  ).toHaveCount(0);
});

test("invalid JSON submission responses are reported explicitly", async ({
  page,
}) => {
  await page.route("**/api/submissions", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: "{",
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "BMW 130d xDrive 26d" }).click();
  await page.locator('input[name="logbook"]').setInputFiles({
    name: "service-log.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Service performed."),
  });
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "The server returned an invalid submission response.",
  );
  await expect(
    page.getByRole("heading", { name: "Submission result" }),
  ).toHaveCount(0);
});
