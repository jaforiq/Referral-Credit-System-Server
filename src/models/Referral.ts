import mongoose, { Schema } from 'mongoose';
import { IReferral } from '../types';

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    referredId: {
      type: String,
      required: true,
      ref: 'User',
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'converted'],
      default: 'pending',
      index: true,
    },
    creditsAwarded: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReferralSchema.index({ referrerId: 1, referredId: 1 }, { unique: true });

export default mongoose.model<IReferral>('Referral', ReferralSchema);