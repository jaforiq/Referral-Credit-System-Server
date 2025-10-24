import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { purchaseValidator } from '../middleware/validators';
import { createPurchase, getUserPurchases } from '../controllers/purchaseController';

const router = Router();

/**
 * @route   POST /api/purchases
 * @desc    Create a new purchase
 * @access  Private
 */
router.post('/', authenticate, purchaseValidator, createPurchase);

/**
 * @route   GET /api/purchases
 * @desc    Get all purchases for logged-in user
 * @access  Private
 */
router.get('/', authenticate, getUserPurchases);

export default router;