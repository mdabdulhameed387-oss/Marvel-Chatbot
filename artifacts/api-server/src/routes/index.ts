import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marvelRouter from "./marvel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marvelRouter);

export default router;
