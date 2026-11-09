import express from "express"
import { getMe, loginUser, registerUser } from "../Controllers/User.js"
import auth from "../Middlewares/Auth.js"

const UserRouter = express.Router()

UserRouter.post("/register", registerUser)
UserRouter.post("/login", loginUser)
UserRouter.get("/me", auth, getMe)

export default UserRouter