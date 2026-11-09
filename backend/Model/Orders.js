import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    pub: { type: String, required: true },
    table: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "preparing", "served", "cancelled", "paid"],
    },
    items: {
      type: [
        {
          drink: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Drinks",
            required: true,
          },
          mixer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Drinks",
            default: null,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
            validate: {
              validator: Number.isInteger,
              message: "La cantidad debe ser un número entero",
            },
          },
          unitPrice: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      validate: {
        validator: (items) => items.length > 0,
        message: "El pedido debe contener al menos una bebida",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Consultas de panel por pub/estado y navegación por fecha e ID, sin recorrer todo el historial.
orderSchema.index({ pub: 1, status: 1, createdAt: -1, _id: -1 });
orderSchema.index({ pub: 1, createdAt: -1, _id: -1 });

const Orders = mongoose.model("Orders", orderSchema);

export default Orders;
