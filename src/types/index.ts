import { Request } from 'express';
import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  referralCode: string;
  referredBy?: string;
  credits: number;
  hasPurchased: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IReferral extends Document {
  referrerId: string;
  referredId: string;
  status: 'pending' | 'converted';
  creditsAwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchase extends Document {
  userId: string;
  amount: number;
  productName: string;
  isFirstPurchase: boolean;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
}

export interface DashboardStats {
  totalReferrals: number;
  convertedReferrals: number;
  totalCredits: number;
  referralLink: string;
  referralCode: string;
}