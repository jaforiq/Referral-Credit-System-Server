import { Response } from 'express';
import User from '../models/User';
import Referral from '../models/Referral';
import { AuthRequest, DashboardStats } from '../types';

export const getDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }
    
    const totalReferrals = await Referral.countDocuments({
      referrerId: userId,
    });
    
    const convertedReferrals = await Referral.countDocuments({
      referrerId: userId,
      status: 'converted',
    });
    
    const referralLink = `${user.referralCode}`;
    
    const stats: DashboardStats = {
      totalReferrals,
      convertedReferrals,
      totalCredits: user.credits,
      referralLink,
      referralCode: user.referralCode,
    };
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard',
      error: error.message,
    });
  }
};

export const getReferrals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const referrals = await Referral.find({ referrerId: userId })
      .populate('referredId', 'name email createdAt hasPurchased')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        referrals,
        count: referrals.length,
      },
    });
  } catch (error: any) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrals',
      error: error.message,
    });
  }
};

export const validateReferralCode = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;
    
    const user = await User.findOne({ referralCode: code });
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Valid referral code',
      data: {
        referrerName: user.name,
      },
    });
  } catch (error: any) {
    console.error('Validate referral code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code',
      error: error.message,
    });
  }
};