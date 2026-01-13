const express = require('express');
const router = express.Router();
const db = require('../db');

// GET All Services (Admin) or filtered
router.get('/', (req, res) => {
    db.all(`SELECT s.*, c.business_name, a.name as agent_name 
            FROM services s 
            LEFT JOIN customers c ON s.customer_id = c.id 
            LEFT JOIN agents a ON s.agent_id = a.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error fetching services' });
        res.json(rows);
    });
});

// UPDATE Service Status
router.put('/:id/status', (req, res) => {
    const { status, agentId } = req.body;
    const serviceId = req.params.id;

    // Assign agent if provided
    let sql = `UPDATE services SET status = ?`;
    let params = [status];

    if (agentId) {
        sql += `, agent_id = ?`;
        params.push(agentId);
    }

    sql += ` WHERE id = ?`;
    params.push(serviceId);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Service updated' });
    });
});

module.exports = router;
