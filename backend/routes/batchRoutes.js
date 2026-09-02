import { Router } from "express";
import { 
  createBatch, 
  uploadBatchFiles, 
  uploadMiddleware, 
  triggerMatching, 
  getBatchSummary, 
  rematchBatch 
} from "../controllers/batchController.js";

const router = Router();

router.post("/batches", createBatch);
router.post("/batches/:id/upload", uploadMiddleware, uploadBatchFiles);
router.post("/batches/:id/match", triggerMatching);
router.get("/batches/:id/summary", getBatchSummary);
router.post("/batches/:id/rematch", rematchBatch);

export default router;
