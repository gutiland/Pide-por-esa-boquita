import mongoose from "mongoose";

const drinksSchema = new mongoose.Schema(
  {
    pub: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    type: { type: String, required: true, trim: true },
    img: { type: String, default: "" },
    category: { type: String, required: true },
    available: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

const Drinks = mongoose.model("Drinks", drinksSchema);

export default Drinks;
