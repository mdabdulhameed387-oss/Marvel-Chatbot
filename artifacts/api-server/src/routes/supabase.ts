import { CheckSupabaseConnectionResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { checkSupabaseConnection } from "../lib/supabase";

const router: IRouter = Router();

router.get("/supabase/health", async (req, res): Promise<void> => {
  try {
    const result = await checkSupabaseConnection();
    if (!result.connected) {
      req.log.warn(
        { statusCode: result.statusCode },
        "Supabase connectivity check returned an unsuccessful status",
      );
      res
        .status(503)
        .json(CheckSupabaseConnectionResponse.parse({ connected: false }));
      return;
    }

    res.json(CheckSupabaseConnectionResponse.parse({ connected: true }));
  } catch (error) {
    req.log.error(
      { errorType: error instanceof Error ? error.name : "unknown" },
      "Supabase connectivity check failed",
    );
    res
      .status(503)
      .json(CheckSupabaseConnectionResponse.parse({ connected: false }));
  }
});

export default router;
