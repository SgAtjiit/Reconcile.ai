import { Router } from "express";
import { getMatchResults, getExceptions, getResultById } from "../controllers/resultController.js";

const router = Router();

router.get("/batches/:id/results", getMatchResults);
router.get("/batches/:id/exceptions", getExceptions);
router.get("/results/:id", getResultById);

export default router;
