import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marvelRouter from "./marvel";
import supabaseRouter from "./supabase";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marvelRouter);
router.use(supabaseRouter);

export default router;
