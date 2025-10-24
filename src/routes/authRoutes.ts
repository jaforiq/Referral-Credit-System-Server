import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { register, login, getProfile } from '../controllers/authController';
import { registerValidator, loginValidator } from '../middleware/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidator, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidator, login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

export default router;