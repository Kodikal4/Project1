const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all active flooring products
router.get('/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM flooring_products WHERE is_active = TRUE');
        res.json({ success: true, products: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Anna adds a new flooring product
router.post('/products', async (req, res) => {
    const { product_name, category, manufacturer_brand, material_style, color, unit_price, pricing_unit, dimensions, sqft_coverage_per_box, description } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO flooring_products (product_name, category, manufacturer_brand, material_style, color, unit_price, pricing_unit, dimensions, sqft_coverage_per_box, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_name, category, manufacturer_brand, material_style, color, unit_price, pricing_unit, dimensions, sqft_coverage_per_box, description]
        );
        res.status(201).json({ success: true, product_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;