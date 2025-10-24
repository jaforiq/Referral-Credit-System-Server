import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDashboard, getReferrals, validateReferralCode } from '../controllers/referralController';

const router = Router();

/**
 * @route   GET /api/referrals/dashboard
 * @desc    Get user dashboard stats
 * @access  Private
 */
router.get('/dashboard', authenticate, getDashboard);

/**
 * @route   GET /api/referrals
 * @desc    Get all referrals for logged-in user
 * @access  Private
 */
router.get('/', authenticate, getReferrals);

/**
 * @route   GET /api/referrals/validate/:code
 * @desc    Validate referral code
 * @access  Public
 */
router.get('/validate/:code', validateReferralCode);

export default router;