import { Router } from "express";
import { vehicles } from "../vehicles.js";

export function createVehicleRouter() {
  const router = Router();

  router.get("/vehicles", (_request, response) => {
    response.json(vehicles);
  });

  return router;
}
