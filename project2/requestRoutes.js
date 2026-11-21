const express = require('express');
const router = express.Router();
const db = require('./db');
const multer = require('multer');
const upload = multer({ limits: { files: 5 } }); // Enforce max 5 photos rule

router.post('/requests', upload.array('photos', 5), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { client_id, service_address, preferred_date_range, proposed_budget } = req.body;

        let rooms = req.body.rooms;
        if (typeof rooms === 'string') {
            rooms = JSON.parse(rooms || '[]');
        }
        if (!Array.isArray(rooms)) {
            return res.status(400).json({ error: 'rooms must be an array' });
        }

        let totalRequestedArea = 0;

        const processedRooms = rooms.map(room => {
            const length = room.length ?? room.length_ft;
            const width = room.width ?? room.width_ft;
            const sqft = (length && width) ? Number(length) * Number(width) : Number(room.total_square_footage || 0);
            totalRequestedArea += sqft;
            return {
                ...room,
                length: length || null,
                width: width || null,
                total_square_footage: sqft
            };
        });

        const [requestResult] = await connection.query(
            `INSERT INTO flooring_requests (client_id, service_address, preferred_date_range, proposed_budget, total_requested_area, status) 
             VALUES (?, ?, ?, ?, ?, 'Submitted')`,
            [client_id, service_address || null, preferred_date_range || null, proposed_budget || null, totalRequestedArea]
        );
        const requestId = requestResult.insertId;

        for (const room of processedRooms) {
            await connection.query(
                `INSERT into room_areas (request_id, product_id, room_name, length, width, total_square_footage, current_flooring_type, removal_required, installation_pattern)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    requestId,
                    room.product_id || null,
                    room.room_name,
                    room.length,
                    room.width,
                    room.total_square_footage,
                    room.current_flooring_type || null,
                    room.removal_required || false,
                    room.installation_pattern || 'Straight'
                ]
            );
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await connection.query(
                    `INSERT INTO project_photos (request_id, photo_url) VALUES (?, ?)`,
                    [requestId, file.filename ? `/uploads/${file.filename}` : file.originalname]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ request_id: requestId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.get('/requests', async (req, res) => {
    try {
        const [requests] = await db.query(`
            SELECT r.*, c.first_name, c.last_name
            FROM flooring_requests r
            JOIN clients c ON r.client_id = c.client_id
            ORDER BY r.created_at DESC, r.request_id DESC
        `);

        for (const r of requests) {
            const [rooms] = await db.query(
                `SELECT * FROM room_areas WHERE request_id = ?`,
                [r.request_id]
            );
            const [photos] = await db.query(
                `SELECT * FROM project_photos WHERE request_id = ?`,
                [r.request_id]
            );
            r.rooms = rooms;
            r.photos = photos;
        }

        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// 2. Anna Generates a Quote with Waste Factor Calculation
router.post('/quotes', async (req, res) => {
    const { request_id, waste_percentage, estimated_labor_cost, other_charges_discounts, proposed_installation_window, note, line_items } = req.body;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get total room area for the request
        const [requestRows] = await connection.query(
            `SELECT total_requested_area FROM flooring_requests WHERE request_id = ?`,
            [request_id]
        );
        if (requestRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: `Request #${request_id} not found` });
        }
        const totalArea = Number(requestRows[0].total_requested_area || 0);
        // Calculate material quantity with waste factor (e.g., 10% waste -> multiplier 1.10)
        const wasteMultiplier = 1 + (waste_percentage / 100);
        const adjustedMaterialQuantity = totalArea * wasteMultiplier;

        let estimatedMaterialCost = 0;

        // Calculate material cost from line items or products catalog
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

        // Update request status
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

// GET all quotes (with request & client info)
router.get('/quotes', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT q.*, r.service_address, r.client_id, c.first_name, c.last_name
            FROM quotes q
            JOIN flooring_requests r ON q.request_id = r.request_id
            JOIN clients c ON r.client_id = c.client_id
            ORDER BY q.request_id DESC, q.quote_version DESC, q.quote_id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET negotiation messages for a request
router.get('/requests/:requestId/messages', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM negotiation_messages WHERE request_id = ? ORDER BY sent_at ASC, message_id ASC`,
            [req.params.requestId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST negotiation / counterproposal message
router.post('/requests/:requestId/messages', async (req, res) => {
    try {
        const { sender_type, message_text } = req.body;
        const [result] = await db.query(
            `INSERT INTO negotiation_messages (request_id, sender_type, message_text) VALUES (?, ?, ?)`,
            [req.params.requestId, sender_type || 'Client', message_text]
        );
        res.status(201).json({ message_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST accept a quote -> creates an order & updates quote/request status
router.post('/quotes/:quoteId/accept', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [quoteRows] = await connection.query(
            `SELECT q.*, r.client_id, r.service_address
             FROM quotes q
             JOIN flooring_requests r ON q.request_id = r.request_id
             WHERE q.quote_id = ?`,
            [req.params.quoteId]
        );
        if (quoteRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Quote not found' });
        }
        const quote = quoteRows[0];

        await connection.query(
            `UPDATE quotes SET status = 'Accepted' WHERE quote_id = ?`,
            [quote.quote_id]
        );
        await connection.query(
            `UPDATE flooring_requests SET status = 'Accepted' WHERE request_id = ?`,
            [quote.request_id]
        );

        const [orderResult] = await connection.query(
            `INSERT INTO orders (quote_id, client_id, service_address, agreed_price, scheduled_installation_date, status)
             VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
            [
                quote.quote_id,
                quote.client_id,
                quote.service_address,
                quote.total_quoted_price,
                req.body.scheduled_installation_date || null,
            ]
        );

        await connection.commit();
        res.status(201).json({ order_id: orderResult.insertId, quote_id: quote.quote_id });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// GET all bills (with order & payment details)
router.get('/bills', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.*, o.client_id, o.service_address, o.agreed_price, o.status AS order_status,
                   p.payment_id, p.amount_paid, p.payment_method, p.status AS payment_status
            FROM bills b
            JOIN orders o ON b.order_id = o.order_id
            LEFT JOIN payments p ON b.bill_id = p.bill_id
            ORDER BY b.order_id DESC, b.bill_version DESC, b.bill_id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST generate a new bill version for an order
router.post('/bills', async (req, res) => {
    try {
        const { order_id, total_billed_amount } = req.body;
        const [verRows] = await db.query(
            `SELECT MAX(bill_version) AS max_v FROM bills WHERE order_id = ?`,
            [order_id]
        );
        const nextVersion = (verRows[0].max_v || 0) + 1;

        const [result] = await db.query(
            `INSERT INTO bills (order_id, bill_version, total_billed_amount, status)
             VALUES (?, ?, ?, 'Unpaid')`,
            [order_id, nextVersion, total_billed_amount]
        );
        res.status(201).json({ bill_id: result.insertId, bill_version: nextVersion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST dispute / response on a bill
router.post('/bills/:billId/disputes', async (req, res) => {
    try {
        const { author_type, message } = req.body;
        const [result] = await db.query(
            `INSERT INTO bill_disputes (bill_id, author_type, message) VALUES (?, ?, ?)`,
            [req.params.billId, author_type || 'Client', message]
        );
        res.status(201).json({ dispute_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST record payment for a bill
router.post('/bills/:billId/pay', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [billRows] = await connection.query(
            `SELECT b.*, o.client_id
             FROM bills b
             JOIN orders o ON b.order_id = o.order_id
             WHERE b.bill_id = ?`,
            [req.params.billId]
        );
        if (billRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Bill not found' });
        }
        const bill = billRows[0];
        const amountPaid = Number(req.body.amount_paid ?? bill.total_billed_amount);
        const method = req.body.payment_method || 'Credit Card';

        const [payResult] = await connection.query(
            `INSERT INTO payments (bill_id, client_id, amount_paid, payment_method, status)
             VALUES (?, ?, ?, ?, 'Success')`,
            [bill.bill_id, bill.client_id, amountPaid, method]
        );

        await connection.query(
            `UPDATE bills SET status = 'Paid' WHERE bill_id = ?`,
            [bill.bill_id]
        );

        await connection.commit();
        res.status(201).json({ payment_id: payResult.insertId, bill_id: bill.bill_id, status: 'Paid' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;