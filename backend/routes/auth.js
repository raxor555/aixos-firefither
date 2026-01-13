const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const path = require('path');

const SECRET_KEY = 'super_secret_key_fire_marketplace'; // In prod, use ENV

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// REGISTER AGENT
router.post('/register/agent', upload.fields([{ name: 'profile_photo', maxCount: 1 }, { name: 'cnic_document', maxCount: 1 }]), (req, res) => {
    const { name, email, password, phone, cnic, territory, terms_accepted } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Get file paths
    const profile_photo = req.files['profile_photo'] ? req.files['profile_photo'][0].filename : null;
    const cnic_document = req.files['cnic_document'] ? req.files['cnic_document'][0].filename : null;

    const termsAcceptedBool = terms_accepted === 'true' || terms_accepted === true ? 1 : 0;

    db.run(`INSERT INTO agents (name, email, password, phone, cnic, territory, status, profile_photo, cnic_document, terms_accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, phone, cnic, territory, 'Pending', profile_photo, cnic_document, termsAcceptedBool],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error registering agent', details: err.message });
            }
            res.status(201).json({ message: 'Agent registered successfully. Pending Admin Approval.', id: this.lastID });
        }
    );
});

// REGISTER CUSTOMER
router.post('/register/customer', (req, res) => {
    const { business_name, owner_name, email, password, phone, address, business_type } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run(`INSERT INTO customers (business_name, owner_name, email, password, phone, address, business_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [business_name, owner_name, email, hashedPassword, phone, address, business_type],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error registering customer' });
            res.status(201).json({ message: 'Customer registered successfully', id: this.lastID });
        }
    );
});

// LOGIN (Generic)
router.post('/login', (req, res) => {
    const { email, password, role } = req.body; // role: 'agent', 'customer', 'admin'

    let table = '';
    if (role === 'agent') table = 'agents';
    else if (role === 'customer') table = 'customers';
    else if (role === 'admin') table = 'admins';
    else return res.status(400).json({ error: 'Invalid role' });

    db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

        // If Agent, check status
        if (role === 'agent' && user.status !== 'Active') {
            return res.status(403).json({ error: 'Account is pending approval. Please contact admin.' });
        }

        const token = jwt.sign({ id: user.id, role: role }, SECRET_KEY, { expiresIn: 86400 }); // 24 hours
        res.status(200).json({ auth: true, token: token, user: user });
    });
});

module.exports = router;
