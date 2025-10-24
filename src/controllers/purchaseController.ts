

import User from '../models/User';
import Referral from '../models/Referral';
import Purchase from '../models/Purchase';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types'; 


const REFERRAL_CREDITS = parseInt(process.env.REFERRAL_CREDITS || '2', 10);
export const createPurchase = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user!.id;
    const { productName, amount } = req.body;

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const purchase = new Purchase({
      userId,
      productName,
      amount,
    });

    try {
      await purchase.save();
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      res.status(500).json({
        success: false,
        message: 'Purchase failed while creating purchase record',
        error: err.message || err,
      });
      return;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, hasPurchased: false },
      { $set: { hasPurchased: true } },
      { new: true }
    ).exec();

    const isFirstPurchase = !!updatedUser; 

    let creditsAwarded = false;

    if (isFirstPurchase) {
      try {
        const referral = await Referral.findOneAndUpdate(
          { referredId: userId, creditsAwarded: false },
          { $set: { creditsAwarded: true, status: 'converted' } },
          { new: false } 
        ).exec();

        
        if (referral) {
          const referrerId = referral.referrerId;

          const incReferrer = User.findByIdAndUpdate(
            referrerId,
            { $inc: { credits: REFERRAL_CREDITS } },
            { new: true }
          ).exec();

          const incUser = User.findByIdAndUpdate(
            userId,
            { $inc: { credits: REFERRAL_CREDITS } },
            { new: true }
          ).exec();

          const [referrerAfter, userAfter] = await Promise.all([incReferrer, incUser]);

          if (!referrerAfter || !userAfter) {
            console.error('Partial credit awarding failure', {
              referrerId,
              referrerAfter,
              userAfter,
            });
          } else {
            creditsAwarded = true;
          }
        } else {
          creditsAwarded = false;
        }
      } catch (awardErr: any) {
        console.error('Error awarding referral credits:', awardErr);
      }
    }

    const userLatest = await User.findById(userId).lean();

    res.status(201).json({
      success: true,
      message: isFirstPurchase
        ? (creditsAwarded ? 'Purchase successful! Credits awarded.' : 'Purchase successful! Credits pending or not available.')
        : 'Purchase successful!',
      data: {
        purchase: {
          id: purchase._id,
          productName: purchase.productName,
          amount: purchase.amount,
          isFirstPurchase,
          createdAt: purchase.createdAt,
        },
        creditsAwarded,
        currentCredits: userLatest ? userLatest.credits : undefined,
      },
    });
  } catch (error: any) {
    console.error('Purchase error (outer):', error);
    res.status(500).json({
      success: false,
      message: 'Purchase failed',
      error: error.message || error,
    });
  }
};

export const getUserPurchases = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const purchases = await Purchase.find({ userId }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: {
        purchases,
        count: purchases.length,
      },
    });
  } catch (error: any) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases',
      error: error.message,
    });
  }
};
