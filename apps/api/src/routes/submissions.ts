import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { isValidVehicle } from "../vehicles.js";

const maxLogbookBytes = 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxLogbookBytes,
    files: 1,
    fields: 3,
    fieldSize: 1024,
    parts: 4,
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createSubmissionRouter() {
  const router = Router();

  router.post(
    "/submissions",
    upload.single("logbook"),
    (request, response) => {
      const body: unknown = request.body;
      const fields = isRecord(body) ? body : {};
      const { make, model, badge } = fields;

      if (
        typeof make !== "string" ||
        typeof model !== "string" ||
        typeof badge !== "string"
      ) {
        response.status(400).json({
          error: "Make, model, and badge are required.",
        });
        return;
      }

      if (!isValidVehicle(make, model, badge)) {
        response.status(400).json({
          error: "The selected make, model, and badge are not a valid vehicle.",
        });
        return;
      }

      if (!request.file) {
        response.status(400).json({ error: "A logbook file is required." });
        return;
      }

      let logbookContents: string;
      try {
        logbookContents = new TextDecoder("utf-8", { fatal: true }).decode(
          request.file.buffer,
        );
      } catch (error) {
        if (!(error instanceof TypeError)) {
          throw error;
        }

        response.status(400).json({
          error: "The logbook must contain valid UTF-8 text.",
        });
        return;
      }

      response.status(201).json({
        make,
        model,
        badge,
        logbookContents,
      });
    },
  );

  router.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          response.status(413).json({
            error: "The logbook must be 1 MiB or smaller.",
          });
          return;
        }

        response.status(400).json({ error: "The upload is invalid." });
        return;
      }

      next(error);
    },
  );

  return router;
}
