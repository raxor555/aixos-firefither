const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configure Multer for Visit Photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'visit-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// SEARCH CUSTOMERS (for Autocomplete)
router.get('/customers/search', (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);

    db.all(`SELECT id, business_name, owner_name, email, phone, address, business_type 
            FROM customers 
            WHERE business_name LIKE ? OR phone LIKE ? LIMIT 10`,
        [`%${query}%`, `%${query}%`],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            res.json(rows);
        });
});

// LOG VISIT (Complex Transaction)
router.post('/visits', upload.any(), (req, res) => {
    const QRCode = require('qrcode');
    const fs = require('fs');
    // req.body will contain flattened data. 
    // inventory items might come as array-like keys or JSON string if sent as such. 
    // For simplicity with FormData, we might receive 'inventory' as a JSON string.

    const {
        agent_id,
        customer_id, // If existing
        // New Customer Details (if customer_id is null/empty)
        business_name, owner_name, email, phone, address, business_type,
        // Visit Details
        notes, risk_assessment, service_recommendations, follow_up_date,
        // Inventory
        inventory // Expecting JSON string: "[{type:'ABC', ...}, ...]"
    } = req.body;

    const processVisit = (finalCustId) => {
        db.run(`INSERT INTO visits (agent_id, customer_id, customer_name, business_type, notes, risk_assessment, service_recommendations, follow_up_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [agent_id, finalCustId, business_name, business_type, notes, risk_assessment, service_recommendations, follow_up_date],
            function (err) {
                if (err) return res.status(500).json({ error: 'Failed to log visit', details: err.message });

                const visitId = this.lastID;

                // Process Inventory
                if (inventory) {
                    try {
                        const items = JSON.parse(inventory);
                        // We need to map photos to items if any. 
                        // Simplified: We assume photos are handled separately or just not fully linked per-row in this basic implementation yet, 
                        // OR we trust the client to send filenames if they uploaded beforehand? 
                        // Better: Client uploads files in this request with fieldnames like 'inventory[0][photo]'.

                        // For this iteration, let's assume basic text data for inventory first to get the structure right.

                        const stmt = db.prepare(`INSERT INTO extinguishers (customer_id, visit_id, type, capacity, quantity, install_date, last_refill_date, expiry_date, condition, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                        items.forEach(item => {
                            stmt.run(finalCustId, visitId, item.type, item.capacity, item.quantity, item.install_date, item.last_refill_date, item.expiry_date, item.condition, 'Valid');
                        });
                        stmt.finalize();

                    } catch (e) {
                        console.error("Inventory parse error", e);
                    }
                }

                res.status(201).json({ message: 'Visit logged successfully', visitId: visitId });
            }
        );
    };

    if (customer_id) {
        processVisit(customer_id);
    } else {
        // Create Lead Customer
        // For leads, password can be a placeholder
        const placeholderPass = '$2a$08$abcdefg...'; // Dummy hash
        const finalEmail = email || `lead-${Date.now()}@temp.com`;

        db.run(`INSERT INTO customers (business_name, owner_name, email, password, phone, address, business_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Lead')`,
            [business_name, owner_name, finalEmail, placeholderPass, phone, address, business_type],
            function (err) {
                if (err) return res.status(500).json({ error: 'Failed to create lead customer', details: err.message });

                const newCustId = this.lastID;

                // GENERATE QR
                const qrDir = path.join(__dirname, '../uploads/qrcodes');
                if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

                const qrContent = JSON.stringify({ id: newCustId, type: 'customer', name: business_name, url: `https://app.aixos.com/customer/${newCustId}` });
                const qrFileName = `qr-lead-${newCustId}-${Date.now()}.png`;
                const qrFilePath = path.join(qrDir, qrFileName);

                QRCode.toFile(qrFilePath, qrContent, { color: { dark: '#000000', light: '#0000' } }, (qrErr) => {
                    if (!qrErr) {
                        const qrUrl = `/uploads/qrcodes/${qrFileName}`;
                        db.run(`UPDATE customers SET qr_code_url = ? WHERE id = ?`, [qrUrl, newCustId]);
                    }
                });

                processVisit(newCustId);
            }
        );
    }
});

// Get Agent Stats (Enhanced for Dashboard)
router.get('/:id/stats', (req, res) => {
    const agentId = req.params.id;
    const sql = `
        SELECT 
            COUNT(*) as totalVisits, 
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as conversions
        FROM visits 
        WHERE agent_id = ?
    `;

    // Mocking historical data for the chart (in a real app, this would be a complex group by query)
    const monthlyData = [
        { name: 'Jan', visits: 12, earnings: 400 },
        { name: 'Feb', visits: 19, earnings: 750 },
        { name: 'Mar', visits: 15, earnings: 600 },
        { name: 'Apr', visits: 22, earnings: 1200 },
        { name: 'May', visits: 30, earnings: 1500 },
        { name: 'Jun', visits: 35, earnings: 1800 },
    ];

    db.get(sql, [agentId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // Mock commission calculation (e.g., $50 per conversion)
        const earnings = (row.conversions || 0) * 50;

        res.json({
            totalVisits: row.totalVisits || 0,
            conversions: row.conversions || 0,
            earnings: earnings,
            chartData: monthlyData // Sending history for Recharts
        });
    });
});

// Get Agent's Customers (CRM)
router.get('/:id/my-customers', (req, res) => {
    const agentId = req.params.id;
    // Select customers who have been visited by this agent
    const sql = `
        SELECT DISTINCT c.*, MAX(v.visit_date) as last_visit
        FROM customers c
        JOIN visits v ON c.id = v.customer_id
        WHERE v.agent_id = ?
        GROUP BY c.id
        ORDER BY last_visit DESC
    `;

    db.all(sql, [agentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// UPDATE LOCATION
router.post('/location', (req, res) => {
    const { id, lat, lng } = req.body;
    const now = new Date().toISOString();

    db.run(`UPDATE agents SET location_lat = ?, location_lng = ?, last_active = ? WHERE id = ?`,
        [lat, lng, now, id],
        (err) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            res.json({ message: 'Location updated' });
        }
    );
});

module.exports = router;
