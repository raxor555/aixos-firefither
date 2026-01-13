const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/admin/agents?status=Pending
router.get('/agents', (req, res) => {
    const { status } = req.query;
    let query = "SELECT id, name, email, phone, cnic, territory, status, created_at, profile_photo, cnic_document FROM agents";
    let params = [];

    if (status) {
        query += " WHERE status = ?";
        params.push(status);
    }

    query += " ORDER BY created_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(rows);
    });
});

// APPROVE AGENT
router.put('/agents/:id/approve', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE agents SET status = 'Active' WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: 'DB update failed' });
        res.json({ message: 'Agent approved successfully' });
    });
});

// REJECT AGENT
router.put('/agents/:id/reject', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE agents SET status = 'Suspended' WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: 'DB update failed' });
        res.json({ message: 'Agent rejected' });
    });
});

// GET ADMIN DASHBOARD STATS (Enhanced)
router.get('/stats', (req, res) => {
    const stats = {};

    db.get(`SELECT COUNT(*) as count FROM agents`, (err, row) => {
        stats.totalAgents = row?.count || 0;

        db.get(`SELECT COUNT(*) as count FROM agents WHERE status = 'Pending'`, (err, row) => {
            stats.pendingAgents = row?.count || 0;

            db.get(`SELECT COUNT(*) as count FROM customers`, (err, row) => {
                stats.totalCustomers = row?.count || 0;

                db.get(`SELECT COUNT(*) as count FROM services`, (err, row) => {
                    stats.totalServices = row?.count || 0;

                    // Mock Revenue Data for Chart
                    stats.revenueChart = [
                        { name: 'Jan', revenue: 4000, services: 24 },
                        { name: 'Feb', revenue: 3000, services: 18 },
                        { name: 'Mar', revenue: 2000, services: 12 },
                        { name: 'Apr', revenue: 2780, services: 20 },
                        { name: 'May', revenue: 1890, services: 15 },
                        { name: 'Jun', revenue: 5390, services: 30 },
                    ];
                    res.json(stats);
                });
            });
        });
    });
});

// GET MAP DATA (Global View)
router.get('/map-data', (req, res) => {
    // Get all agents with Lat/Lng (Simulated) and Customers
    // For agents, we might not have lat/lng in DB yet, so we mock or use customers

    const data = {
        agents: [],
        customers: []
    };

    db.all(`SELECT id, name, email, territory, status, location_lat, location_lng, last_active FROM agents WHERE status='Active'`, (err, agents) => {
        if (err) return res.status(500).json({ error: err.message });

        // Mocking random locations for agents based on 'Territory' roughly
        // In real app, agents would have a live location or assigned center
        data.agents = agents.map(a => ({
            ...a,
            lat: a.location_lat || (40.7128 + (Math.random() * 0.1 - 0.05)),
            lng: a.location_lng || (-74.0060 + (Math.random() * 0.1 - 0.05)),
            type: 'agent'
        }));

        db.all(`SELECT id, business_name, address, status, location_lat, location_lng FROM customers`, (err, customers) => {
            if (err) return res.status(500).json({ error: err.message });

            data.customers = customers.map(c => ({
                ...c,
                // Fallback if no location set
                lat: c.location_lat || (40.7128 + (Math.random() * 0.2 - 0.1)),
                lng: c.location_lng || (-74.0060 + (Math.random() * 0.2 - 0.1)),
                type: 'customer'
            }));

            res.json(data);
        });
    });
});

// GET ALL CUSTOMERS
router.get('/customers', (req, res) => {
    const query = `
        SELECT id, business_name, owner_name, email, phone, address, business_type, status, created_at 
        FROM customers 
        ORDER BY created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
