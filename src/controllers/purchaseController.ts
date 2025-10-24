// import { Response } from 'express';
// import { validationResult } from 'express-validator';
// import mongoose from 'mongoose';
// import { AuthRequest } from '../types';
// import User from '../models/User';
// import Purchase from '../models/Purchase';
// import Referral from '../models/Referral';

// const REFERRAL_CREDITS = parseInt(process.env.REFERRAL_CREDITS || '2', 10);

// export const createPurchase = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   const session = await mongoose.startSession();
  
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array(),
//       });
//       return;
//     }
    
//     const userId = req.user!.id;
//     const { productName, amount } = req.body;
    
//     const user = await User.findById(userId).session(session);
//     if (!user) {
//       res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//       return;
//     }
    
//     await session.startTransaction();
    
//     const isFirstPurchase = !user.hasPurchased;
    
//     const purchase = new Purchase({
//       userId,
//       productName,
//       amount,
//       isFirstPurchase,
//     });
    
//     await purchase.save({ session });
    
//     if (isFirstPurchase) {
//       user.hasPurchased = true;
//       await user.save({ session });
      
//       const referral = await Referral.findOne({
//         referredId: userId,
//         creditsAwarded: false,
//       }).session(session);
      
//       if (referral) {
//         const referrer = await User.findById(referral.referrerId).session(session);
        
//         if (referrer && !referral.creditsAwarded) {
//           referrer.credits += REFERRAL_CREDITS;
//           await referrer.save({ session });
          
//           user.credits += REFERRAL_CREDITS;
//           await user.save({ session });
          
//           referral.status = 'converted';
//           referral.creditsAwarded = true;
//           await referral.save({ session });
//         }
//       }
//     }
    
//     await session.commitTransaction();
    
//     res.status(201).json({
//       success: true,
//       message: isFirstPurchase 
//         ? 'Purchase successful! Credits awarded.' 
//         : 'Purchase successful!',
//       data: {
//         purchase: {
//           id: purchase._id,
//           productName: purchase.productName,
//           amount: purchase.amount,
//           isFirstPurchase,
//           createdAt: purchase.createdAt,
//         },
//         creditsAwarded: isFirstPurchase,
//         currentCredits: user.credits,
//       },
//     });
//   } catch (error: any) {
//     await session.abortTransaction();
//     console.error('Purchase error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Purchase failed',
//       error: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };

// export const getUserPurchases = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const userId = req.user!.id;
    
//     const purchases = await Purchase.find({ userId }).sort({ createdAt: -1 });
    
//     res.status(200).json({
//       success: true,
//       data: {
//         purchases,
//         count: purchases.length,
//       },
//     });
//   } catch (error: any) {
//     console.error('Get purchases error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch purchases',
//       error: error.message,
//     });
//   }
// };

// purchasesController.ts (or authController.ts — whatever file you use)
import User from '../models/User';
import Referral from '../models/Referral';
import Purchase from '../models/Purchase';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types'; // adjust if your auth request type path differs
//import { REFERRAL_CREDITS } from '../config/constants'; // adjust path/name as needed


const REFERRAL_CREDITS = parseInt(process.env.REFERRAL_CREDITS || '2', 10);
// Create purchase WITHOUT transactions. Uses atomic updates to reduce races.
export const createPurchase = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // validation
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

    // ensure user exists
    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 1) create purchase record first (no session)
    const purchase = new Purchase({
      userId,
      productName,
      amount,
      // isFirstPurchase will be determined below
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

    // 2) attempt to atomically mark user.hasPurchased = true only if it was false
    // If this returns non-null, we successfully flipped from false -> true and this is the first purchase.
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, hasPurchased: false },
      { $set: { hasPurchased: true } },
      { new: true }
    ).exec();

    const isFirstPurchase = !!updatedUser; // true if we changed hasPurchased to true

    let creditsAwarded = false;

    if (isFirstPurchase) {
      try {
        // 3) atomically mark referral as credited (only if not already credited)
        // This ensures only a single process awards credits for the referral.
        const referral = await Referral.findOneAndUpdate(
          { referredId: userId, creditsAwarded: false },
          { $set: { creditsAwarded: true, status: 'converted' } },
          { new: false } // we only need to know whether the update matched; return pre-image isn't critical
        ).exec();

        // If referral was found AND matched creditsAwarded:false, the findOneAndUpdate returns the previous doc (or null).
        // If referral is null, either there was no referral or it was already credited.
        if (referral) {
          // award credits to referrer and referred user using atomic increments
          const referrerId = referral.referrerId;

          // increment referrer credits
          const incReferrer = User.findByIdAndUpdate(
            referrerId,
            { $inc: { credits: REFERRAL_CREDITS } },
            { new: true }
          ).exec();

          // increment referred user's credits
          const incUser = User.findByIdAndUpdate(
            userId,
            { $inc: { credits: REFERRAL_CREDITS } },
            { new: true }
          ).exec();

          // run both increments concurrently
          const [referrerAfter, userAfter] = await Promise.all([incReferrer, incUser]);

          // If either update failed, log it (we cannot rollback without a transaction)
          if (!referrerAfter || !userAfter) {
            console.error('Partial credit awarding failure', {
              referrerId,
              referrerAfter,
              userAfter,
            });
            // creditsAwarded remains false if either update failed; but since referral.creditsAwarded was set true,
            // we won't try awarding again. You may want a background reconciliation job to detect such partial failures.
          } else {
            creditsAwarded = true;
          }
        } else {
          // No referral found or it was already credited — no credits to award
          creditsAwarded = false;
        }
      } catch (awardErr: any) {
        // If something goes wrong during awarding, log it. referral may already be marked; that's fine.
        console.error('Error awarding referral credits:', awardErr);
        // We won't attempt further compensation here; inform the client that purchase succeeded but credits maybe not awarded.
      }
    }

    // 4) fetch latest user credits to return accurate currentCredits
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

// Get user purchases — unchanged except removing session usage
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
