import { Router } from "express";
import auth from "../Middlewares/Auth.js";
import {
  getPushConfig,
  subscribePush,
  unsubscribePush,
  testPush,
} from "../Controllers/Push.js";

const router = Router();
router.use(auth);
router.get("/config", getPushConfig);
router.post("/subscriptions", subscribePush);
router.delete("/subscriptions", unsubscribePush);
router.post("/test", testPush);
export default router;
