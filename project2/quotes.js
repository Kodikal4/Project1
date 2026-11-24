const express = require('express');
const router = express.Router();
const db = require('./db');

router.post('/quotes', async (req, res) => {
    const { request_id, waste_percentage, estimated_labor_cost, other_charges_discounts, proposed_installation_window, note, line_items } = req.body;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [requestRows] = await connection.query('SELECT total_requested_area, client_id, service_address FROM flooring_requests WHERE request_id = ?`, [request_id]);')
        if (requestRows.length === 0) throw new Error('Request not found');
        const { total_requested_area, client_id, service_address } = requestRows[0];

        const wasteMultiplier = 1 + (parseFloat(waste_percentage) / 100);
        const adjustedMaterialQuantity = total_requested_area * wasteMultiplier;
        
        let estimatedMaterialCost = 0;
        for (const item of line_items) {
            if (item.item_type === 'material') {
                item.quantity = adjustedMaterialQuantity;
                item.total_price = item.quantity * item.unit_price;
                estimatedMaterialCost += item.total_price;
            } else {
                item.total_price = item.quantity * item.unit_price;
            }
        }

        const totalQuotedPrice = estimatedMaterialCost + parseFloat(estimated_labor_cost) + parseFloat(other_charges_discounts || 0);

        const [versionRows] = await connection.query(`SELECT MAX(quote_version) as max_v FROM quotes WHERE request_id = ?`, [request_id]);

        const nextVersion = (versionRows[0].max_v || 0) + 1;

        const [quoteResult] = await connection.query(
            `INSERT INTO quotes (request_id, quote_version, waste_percentage, estimated_material_cost, estimated_labor_cost, other_charges_discounts, total_quoted_price, proposed_installation_window, note, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [request_id, nextVersion, waste_percentage, estimatedMaterialCost, estimated_labor_cost, other_charges_discounts, totalQuotedPrice, proposed_installation_window, note]
        );

       const quoteId = quoteResult.insertId;

        for (const item of line_items) {
            await connection.query(
                `INSERT INTO quote_items (quote_id, item_type, description, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [quoteId, item.item_type, item.description, item.quantity, item.unit_price, item.total_price]
            );
        }

        await connection.query(`UPDATE flooring_requests SET status = 'Quoted' WHERE request_id = ?`, [request_id]);

        await connection.commit();
        res.status(201).json({ success: true, quote_id: quoteId, quote_version: nextVersion, total_quoted_price: totalQuotedPrice });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.post('/quotes/:id/accept', async (req, res) => {
    const quoteId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [quoteRows] = await connection.query(`SELECT q.*, r.client_id, r.service_address FROM quotes q JOIN flooring_requests r ON q.request_id = r.request_id WHERE q.quote_id = ?`, [quoteId]);
        if (quoteRows.length === 0) {
            throw new Error("Quote not found");
        }
        const quote = quoteRows[0];

        await connection.query(`UPDATE quotes SET status = 'Accepted' WHERE quote_id = ?`, [quoteId]);
        await connection.query(`UPDATE flooring_requests SET status = 'Accepted' WHERE request_id = ?`, [quote.request_id]);

        const [orderResult] = await connection.query(
            `INSERT INTO orders (quote_id, client_id, service_address, agreed_price, scheduled_installation_date, status)
             VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
            [quoteId, quote.client_id, quote.service_address, quote.total_quoted_price, quote.proposed_installation_window]
        );

        await connection.commit();
        res.json({ success: true, order_id: orderResult.insertId, message: 'Quote accepted and order created successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.post('/requests/:id/negotiate', async (req, res) => {
    const requestId = req.params.id;
    const { sender_type, message_text } = req.body;
    try {
        await db.query(
            `INSERT INTO negotiation_messages (request_id, sender_type, message_text) VALUES (?, ?, ?)`,
            [requestId, sender_type, message_text]
        );
        await db.query(`UPDATE flooring_requests SET status = 'Negotiating' WHERE request_id = ?`, [requestId]);
        res.status(201).json({ success: true, message: 'Negotiation message recorded' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;