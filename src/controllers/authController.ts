import User from '../models/User';
import Referral from '../models/Referral';
import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';
import { validationResult } from 'express-validator';


export const register = async (req: Request, res: Response): Promise<void> => {
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

    const { email, password, name, referralCode } = req.body;

    // 2) validate referralCode early (fail fast)
    let referrer: any = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode }).lean();
      if (!referrer) {
        res.status(400).json({
          success: false,
          message: 'Invalid referral code',
        });
        return;
      }
    }

    // 3) create user (handle duplicate email at DB level)
    let user;
    try {
      user = new User({
        email,
        password,
        name,
        referredBy: referrer ? referrer._id.toString() : null,
      });
      await user.save();
    } catch (err: any) {
      // Duplicate key (unique index) on email (and possibly other unique fields)
      if (err && (err.code === 11000 || err.codeName === 'DuplicateKey')) {
        res.status(400).json({
          success: false,
          message: 'User already exists with this email',
          detail: err.keyValue ? err.keyValue : undefined,
        });
        return;
      }

      // generic DB error creating user
      console.error('Error creating user:', err);
      res.status(500).json({
        success: false,
        message: 'Registration failed while creating user',
        error: err.message || err,
      });
      return;
    }

    // 4) create referral record if there is a referrer
    if (referrer) {
      try {
        const referral = new Referral({
          referrerId: referrer._id.toString(),
          referredId: user.id.toString(),
          status: 'pending',
          creditsAwarded: false,
        });
        await referral.save();
      } catch (refErr: any) {
        // If referral creation fails, clean up the user we just created (compensating action)
        try {
          await User.deleteOne({ _id: user._id });
        } catch (cleanupErr) {
          // If cleanup fails, log it — we cannot do more here (would require background job/repair)
          console.error('Failed to rollback user after referral creation error:', cleanupErr);
        }

        console.error('Error creating referral:', refErr);
        res.status(500).json({
          success: false,
          message: 'Registration failed while creating referral',
          error: refErr.message || refErr,
        });
        return;
      }
    }

    // 5) generate token and respond
    const token = generateToken({
      id: user.id.toString(),
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          referralCode: user.referralCode,
          credits: user.credits,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Registration error (outer):', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message || error,
    });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
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
    
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }
    
    const token = generateToken({
      id: user.id.toString(),
      email: user.email,
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          referralCode: user.referralCode,
          credits: user.credits,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          referralCode: user.referralCode,
          credits: user.credits,
          hasPurchased: user.hasPurchased,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};