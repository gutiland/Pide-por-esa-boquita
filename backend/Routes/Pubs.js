import { Router } from "express";
import { loginPub, getMe, getPublicPub } from "../Controllers/Pubs.js";
import auth from "../Middlewares/Auth.js";

const router = Router();
router.post("/login", loginPub);
router.get("/me", auth, getMe);
router.get("/:slug", getPublicPub);
// No hay registro público: las cuentas de bares se crean mediante el script de administración.
export default router;