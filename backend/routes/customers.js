const express = require('express');
const router = express.Router();
const db = require('../db');

// GET Customer Dashboard (Inventory + Pending Services)
router.get('/:id/dashboard', (req, res) => {
    const customerId = req.params.id;

    db.all(`SELECT * FROM extinguishers WHERE customer_id = ?`, [customerId], (err, extinguishers) => {
        if (err) return res.status(500).json({ error: 'Error fetching inventory' });

        db.all(`SELECT * FROM services WHERE customer_id = ? ORDER BY request_date DESC LIMIT 5`, [customerId], (err, services) => {
            if (err) return res.status(500).json({ error: 'Error fetching history' });
            res.json({ extinguishers, services });
        });
    });
});

// GET Customer Inventory (Dedicated)
router.get('/:id/inventory', (req, res) => {
    const customerId = req.params.id;
    db.all(`SELECT * FROM extinguishers WHERE customer_id = ?`, [customerId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching inventory' });
        res.json(rows);
    });
});

// GET Customer History (Dedicated)
router.get('/:id/history', (req, res) => {
    const customerId = req.params.id;
    db.all(`SELECT * FROM services WHERE customer_id = ? ORDER BY scheduled_date DESC`, [customerId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching history' });
        res.json(rows);
    });
});

// BOOK SERVICE
router.post('/book', (req, res) => {
    const { customerId, serviceType, date, notes, assetIds } = req.body;

    db.run(`INSERT INTO services (customer_id, service_type, scheduled_date, notes) VALUES (?, ?, ?, ?)`,
        [customerId, serviceType, date, notes],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const serviceId = this.lastID;

            // Insert selected assets if any
            if (assetIds && assetIds.length > 0) {
                const stmt = db.prepare(`INSERT INTO service_items (service_id, extinguisher_id) VALUES (?, ?)`);
                assetIds.forEach(id => {
                    stmt.run(serviceId, id);
                });
                stmt.finalize();
            }

            res.status(201).json({ message: 'Service booked successfully', id: serviceId });
        }
    );
});

// ADD EXTINGUISHER
router.post('/inventory', (req, res) => {
    const { customerId, type, capacity, quantity, installDate, expiryDate } = req.body;
    db.run(`INSERT INTO extinguishers (customer_id, type, capacity, quantity, install_date, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Valid')`,
        [customerId, type, capacity, quantity, installDate, expiryDate],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Extinguisher added', id: this.lastID });
        }
    );
});

// UPDATE LOCATION
router.post('/location', (req, res) => {
    const { id, lat, lng } = req.body;
    db.run(`UPDATE customers SET location_lat = ?, location_lng = ? WHERE id = ?`,
        [lat, lng, id],
        (err) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            res.json({ message: 'Location updated' });
        }
    );
});

module.exports = router;
