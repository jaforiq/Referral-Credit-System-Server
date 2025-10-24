import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { IUser } from '../types';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    referralCode: {
      type: String,
      unique: true,
      required: false,
      index: true,
    },
    referredBy: {
      type: String,
      ref: 'User',
      default: null,
      index: true,
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasPurchased: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Generate unique referral code before saving
UserSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    let code = nanoid();
    let isUnique = false;
    
    while (!isUnique) {
      const existing = await mongoose.models.User.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      } else {
        code = nanoid();
      }
    }
    
    this.referralCode = code;
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model<IUser>('User', UserSchema);