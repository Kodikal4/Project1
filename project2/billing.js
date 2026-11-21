const express = require('express');
const router = express.Router();
const db = require('./db');

// Anna generates a bill for a completed order
router.post('/bills', async (req, res) => {
    const { order_id, total_billed_amount } = req.body;
    try {
        const [versionRows] = await db.query(`SELECT MAX(bill_version) as max_v FROM bills WHERE order_id = ?`, [order_id]);
        const nextVersion = (versionRows[0].max_v || 0) + 1;

        const [result] = await db.query(
            `INSERT INTO bills (order_id, bill_version, total_billed_amount, status) VALUES (?, ?, ?, 'Unpaid')`,
            [order_id, nextVersion, total_billed_amount]
        );
        res.status(201).json({ success: true, bill_id: result.insertId, bill_version: nextVersion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Client submits a bill dispute
router.post('/bills/:id/dispute', async (req, res) => {
    const billId = req.params.id;
    const { author_type, message } = req.body;
    try {
        await db.query(
            `INSERT INTO bill_disputes (bill_id, author_type, message) VALUES (?, ?, ?)`,
            [billId, author_type, message]
        );
        await db.query(`UPDATE bills SET status = 'Under Dispute' WHERE bill_id = ?`, [billId]);
        res.status(201).json({ success: true, message: 'Dispute registered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Client pays a bill
router.post('/bills/:id/pay', async (req, res) => {
    const billId = req.params.id;
    const { client_id, amount_paid, payment_method } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [paymentResult] = await connection.query(
            `INSERT INTO payments (bill_id, client_id, amount_paid, payment_method, status) VALUES (?, ?, ?, ?, 'Success')`,
            [billId, client_id, amount_paid, payment_method || 'Credit Card']
        );

        await connection.query(`UPDATE bills SET status = 'Paid' WHERE bill_id = ?`, [billId]);

        await connection.commit();
        res.json({ success: true, payment_id: paymentResult.insertId, message: 'Payment processed successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;