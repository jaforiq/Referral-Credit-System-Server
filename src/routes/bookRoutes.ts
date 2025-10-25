import { Router } from 'express';
import { body } from 'express-validator';
import { createBook, getAllBooks, getBookById } from '../controllers/bookController';

const router = Router();

const bookValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('author').trim().notEmpty().withMessage('Author is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('coverImage').trim().notEmpty().withMessage('Cover image is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
];

/**
 * @route   POST /api/books
 * @desc    Create a new book
 * @access  Public (can be protected in production)
 */
router.post('/', bookValidator, createBook);

/**
 * @route   GET /api/books
 * @desc    Get all books (with optional filtering)
 * @access  Public
 */
router.get('/', getAllBooks);

/**
 * @route   GET /api/books/:id
 * @desc    Get book by ID
 * @access  Public
 */
router.get('/:id', getBookById);

export default router;