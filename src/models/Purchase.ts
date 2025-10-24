import mongoose, { Schema } from 'mongoose';
import { IPurchase } from '../types';

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    productName: {
      type: String,
      required: true,
    },
    isFirstPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);