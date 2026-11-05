import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import { createApp } from "../app.js";
import { isValidVehicle, vehicles } from "../vehicles.js";

async function startTestServer(context: TestContext): Promise<string> {
  const server = createApp().listen(0);
  await once(server, "listening");
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The test server did not bind to a TCP port");
  }

  return `http://127.0.0.1:${address.port}`;
}

function createSubmissionForm(options: {
  make?: string;
  model?: string;
  badge?: string;
  content?: string | Uint8Array<ArrayBuffer>;
  includeFile?: boolean;
} = {}): FormData {
  const {
    make = "Ford",
    model = "Ranger",
    badge = "Raptor",
    content = "Service performed: oil change.",
    includeFile = true,
  } = options;
  const form = new FormData();
  form.set("make", make);
  form.set("model", model);
  form.set("badge", badge);

  if (includeFile) {
    form.set(
      "logbook",
      new Blob([content], { type: "text/plain" }),
      "service-log.txt",
    );
  }

  return form;
}

test("GET /api/vehicles returns the vehicle catalog", async (context) => {
  const baseUrl = await startTestServer(context);
  const response = await fetch(`${baseUrl}/api/vehicles`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), vehicles);
});

test(
  "POST /api/submissions returns the validated vehicle and logbook",
  async (context) => {
    const baseUrl = await startTestServer(context);
    const response = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      body: createSubmissionForm(),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      make: "Ford",
      model: "Ranger",
      badge: "Raptor",
      logbookContents: "Service performed: oil change.",
    });
  },
);

test(
  "POST /api/submissions rejects an invalid vehicle combination",
  async (context) => {
    const baseUrl = await startTestServer(context);
    const response = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      body: createSubmissionForm({ badge: "XR8" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "The selected make, model, and badge are not a valid vehicle.",
    });
  },
);

test("POST /api/submissions requires a logbook file", async (context) => {
  const baseUrl = await startTestServer(context);
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: "POST",
    body: createSubmissionForm({ includeFile: false }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "A logbook file is required.",
  });
});

test("POST /api/submissions requires all vehicle fields", async (context) => {
  const baseUrl = await startTestServer(context);
  const form = new FormData();
  form.set("model", "Ranger");
  form.set("badge", "Raptor");
  form.set(
    "logbook",
    new Blob(["Service performed."], { type: "text/plain" }),
    "service-log.txt",
  );
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Make, model, and badge are required.",
  });
});

test("POST /api/submissions rejects invalid UTF-8", async (context) => {
  const baseUrl = await startTestServer(context);
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: "POST",
    body: createSubmissionForm({ content: new Uint8Array([255]) }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "The logbook must contain valid UTF-8 text.",
  });
});

test("POST /api/submissions accepts at most one file", async (context) => {
  const baseUrl = await startTestServer(context);
  const form = createSubmissionForm();
  form.append(
    "logbook",
    new Blob(["Another logbook."], { type: "text/plain" }),
    "another-log.txt",
  );
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "The upload is invalid.",
  });
});

test(
  "POST /api/submissions accepts a logbook exactly 1 MiB in size",
  async (context) => {
    const baseUrl = await startTestServer(context);
    const response = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      body: createSubmissionForm({ content: "x".repeat(1024 * 1024) }),
    });

    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.logbookContents.length, 1024 * 1024);
  },
);

test(
  "POST /api/submissions rejects logbooks larger than 1 MiB",
  async (context) => {
    const baseUrl = await startTestServer(context);
    const response = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      body: createSubmissionForm({ content: "x".repeat(1024 * 1024 + 1) }),
    });

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: "The logbook must be 1 MiB or smaller.",
    });
  },
);

test("isValidVehicle accepts a supported make, model, and badge", () => {
  assert.equal(isValidVehicle("Ford", "Ranger", "Raptor"), true);
});

test("isValidVehicle validates the submitted values together", () => {
  assert.equal(isValidVehicle("Toyota", "Ranger", "Raptor"), false);
  assert.equal(isValidVehicle("Ford", "Mustang", "Raptor"), false);
  assert.equal(isValidVehicle("Ford", "Ranger", "XR8"), false);
  assert.equal(isValidVehicle("Ford", "Ranger", "Wildtrak"), true);
});

test("Ford Falcon Ute has the banana badge last", () => {
  assert.deepEqual(vehicles.Ford["Falcon Ute"], [
    "XR6",
    "XR6 Turbo",
    "🍌",
  ]);
});

test("isValidVehicle rejects inherited object properties", () => {
  assert.equal(
    isValidVehicle("constructor", "prototype", "toString"),
    false,
  );
});
