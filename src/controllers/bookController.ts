import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Book from '../models/Book';

export const createBook = async (req: Request, res: Response): Promise<void> => {
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

    const { title, author, description, price, coverImage, category, rating } = req.body;

    const book = new Book({
      title,
      author,
      description,
      price,
      coverImage,
      category,
      rating: rating || 0,
    });

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: { book },
    });
  } catch (error: any) {
    console.error('Create book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create book',
      error: error.message,
    });
  }
};

export const getAllBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    
    let query: any = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }

    const books = await Book.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        books,
        count: books.length,
      },
    });
  } catch (error: any) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books',
      error: error.message,
    });
  }
};

export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id);

    if (!book) {
      res.status(404).json({
        success: false,
        message: 'Book not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { book },
    });
  } catch (error: any) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book',
      error: error.message,
    });
  }
};