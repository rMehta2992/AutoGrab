import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createSubmissionRouter } from "./routes/submissions.js";
import { createVehicleRouter } from "./routes/vehicles.js";

export function createApp() {
  const app = express();

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api", createVehicleRouter());
  app.use("/api", createSubmissionRouter());

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (response.headersSent) {
        next(error);
        return;
      }

      console.error("Unhandled API error:", error);
      response
        .status(500)
        .json({ error: "An unexpected server error occurred." });
    },
  );

  return app;
}
