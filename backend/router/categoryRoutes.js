// backend/router/categoryRoutes.js
import express from "express";
import { Category } from "../models/Category.js";

const router = express.Router();

// GET /api/categories  -> all categories sorted
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return res.status(500).json({ message: "Error fetching categories" });
  }
});

// POST /api/categories -> create new category
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name required" });
    }

    const normalized = String(name).trim();
    // case-insensitive exact match check
    const existing = await Category.findOne({
      name: { $regex: `^${normalized}$`, $options: "i" }
    });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name: normalized });
    return res.status(201).json(category);
  } catch (error) {
    console.error("POST /api/categories error:", error);
    // handle unique index duplicate key
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    return res.status(500).json({ message: "Error creating category" });
  }
});

// GET /api/categories/search?q=Art  -> prefix autocomplete
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !String(q).trim()) return res.json([]);

    const regex = new RegExp("^" + q.trim(), "i");
    const categories = await Category.find({ name: regex }).limit(10).sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    console.error("GET /api/categories/search error:", error);
    return res.status(500).json({ message: "Error searching categories" });
  }
});

export default router;
