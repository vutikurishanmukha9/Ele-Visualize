import { Request, Response } from 'express';
import { elements, categories, getElementByNumber, getElementsByCategory } from '../data/elements.js';

export const getHealth = (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export const getRoot = (req: Request, res: Response) => {
    res.send('Ele-Visualize Backend is Running <br>Access API at /api/elements');
};

export const getAllElements = (req: Request, res: Response) => {
    const { category, limit } = req.query;
    let result = elements;

    if (category && typeof category === 'string') {
        result = getElementsByCategory(category);
    }

    if (limit) {
        result = result.slice(0, parseInt(limit as string));
    }

    res.json(result);
};

export const getElementById = (req: Request, res: Response) => {
    const atomicNumber = parseInt(req.params.atomicNumber);
    const element = getElementByNumber(atomicNumber);
    if (!element) {
        res.status(404).json({ error: 'Element not found' });
        return;
    }
    res.json(element);
};

export const getCategories = (req: Request, res: Response) => {
    res.json(categories);
};
