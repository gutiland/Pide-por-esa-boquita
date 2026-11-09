import express from "express";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
} from "../Controllers/Orders.js";
import auth from "../Middlewares/Auth.js";

const OrderRouter = express.Router();

// Los clientes pueden enviar un pedido sin iniciar sesión.
OrderRouter.post("/", createOrder);

// El personal necesita JWT y solo recibe los pedidos de su pub.
OrderRouter.get("/", auth, getOrders);

OrderRouter.patch("/:id/status", auth, updateOrderStatus);

export default OrderRouter;
