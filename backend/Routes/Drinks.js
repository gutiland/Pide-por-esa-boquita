import auth from "../Middlewares/Auth.js";
import express from "express";
import {
  getDrinks,
  createDrinks,
  editDrinks,
  deleteDrinks,
} from "../Controllers/Drinks.js";

const DrinksRouter = express.Router();

DrinksRouter.get("/", getDrinks);
DrinksRouter.post("/", auth, createDrinks);
DrinksRouter.put("/:id", auth, editDrinks);
DrinksRouter.delete("/:id", auth, deleteDrinks);

export default DrinksRouter;
