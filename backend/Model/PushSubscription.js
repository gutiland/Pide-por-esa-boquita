import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  pub: { type: mongoose.Schema.Types.ObjectId, ref: "Pub", required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
subscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("PushSubscription", subscriptionSchema);