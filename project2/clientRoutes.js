const express = require('express');
const router = express.Router();
const db = require('./db');

// Register a new client
router.post('/clients', async (req, res) => {
    const { first_name, last_name, address, phone_number, email, credit_card_token } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO clients (first_name, last_name, address, phone_number, email, credit_card_token)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, address, phone_number, email, credit_card_token]
        );
        res.status(201).json({ success: true, client_id: result.insertId, message: 'Client registered successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Email already registered.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Get client profile
router.get('/clients/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT client_id, first_name, last_name, address, phone_number, email, created_at FROM clients WHERE client_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });
        res.json({ success: true, client: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;