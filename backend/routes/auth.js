const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_fire_marketplace';

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
router.post('/register/agent', upload.fields([{ name: 'profile_photo', maxCount: 1 }, { name: 'cnic_document', maxCount: 1 }]), async (req, res) => {
    const { name, email, password, phone, cnic, territory, terms_accepted } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Get file paths
    const profile_photo = req.files['profile_photo'] ? req.files['profile_photo'][0].filename : null;
    const cnic_document = req.files['cnic_document'] ? req.files['cnic_document'][0].filename : null;

    const termsAcceptedBool = terms_accepted === 'true' || terms_accepted === true;

    try {
        const { data, error } = await supabase
            .from('agents')
            .insert([
                {
                    name,
                    email,
                    password: hashedPassword,
                    phone,
                    cnic,
                    territory,
                    status: 'Pending',
                    profile_photo,
                    cnic_document,
                    terms_accepted: termsAcceptedBool
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Agent registered successfully. Pending Admin Approval.', id: data[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error registering agent', details: err.message });
    }
});

// REGISTER CUSTOMER
router.post('/register/customer', async (req, res) => {
    const { business_name, owner_name, email, password, phone, address, business_type } = req.body;
    const QRCode = require('qrcode');
    const fs = require('fs');

    const hashedPassword = bcrypt.hashSync(password, 8);

    // Handle Optional Email
    let finalEmail = email;
    if (!finalEmail || finalEmail.trim() === '') {
        finalEmail = `no-email-${Date.now()}-${Math.floor(Math.random() * 1000)}@aixos-placeholder.com`;
    }

    try {
        const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert([
                { business_name, owner_name, email: finalEmail, password: hashedPassword, phone, address, business_type }
            ])
            .select();

        if (customerError) throw customerError;

        const customerId = customerData[0].id;

        // Generate QR Code
        const qrDir = path.join(__dirname, '../uploads/qrcodes');
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        const qrContent = JSON.stringify({
            id: customerId,
            type: 'customer',
            name: business_name,
            url: `https://app.aixos.com/customer/${customerId}`
        });

        const qrFileName = `qr-customer-${customerId}-${Date.now()}.png`;
        const qrFilePath = path.join(qrDir, qrFileName);

        await QRCode.toFile(qrFilePath, qrContent, {
            color: {
                dark: '#000000',
                light: '#0000'
            }
        });

        const qrUrl = `/uploads/qrcodes/${qrFileName}`;

        const { error: updateError } = await supabase
            .from('customers')
            .update({ qr_code_url: qrUrl })
            .eq('id', customerId);

        if (updateError) console.error("QR Update Error:", updateError);

        res.status(201).json({ message: 'Customer registered successfully', id: customerId, qr_code_url: qrUrl });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: 'Error registering customer', details: err.message });
    }
});

// LOGIN (Generic)
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    let table = '';
    if (role === 'agent') table = 'agents';
    else if (role === 'customer') table = 'customers';
    else if (role === 'admin') table = 'admins';
    else return res.status(400).json({ error: 'Invalid role' });

    try {
        const { data: user, error } = await supabase
            .from(table)
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

        if (role === 'agent' && user.status !== 'Active') {
            return res.status(403).json({ error: 'Account is pending approval. Please contact admin.' });
        }

        // FORGOT PASSWORD - SEND OTP
        router.post('/forgot-password', async (req, res) => {
            const { email } = req.body;

            try {
                // Generate 6-digit OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

                // Store in Supabase (Assume table 'otps' exists)
                const { error: otpError } = await supabase
                    .from('otps')
                    .upsert([{ email, otp, expires_at: expiresAt }], { onConflict: 'email' });

                if (otpError) throw otpError;

                // Send Email
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: `"AiXOS Red" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: 'Your Password Reset OTP - AiXOS Red',
                    text: `Your OTP for password reset is: ${otp}. This code will expire in 10 minutes.`
                };

                // In a real scenario, we'd wait for this, but for now we'll just log
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) console.error('Email Error:', error);
                    else console.log('Email sent:', info.response);
                });

                res.status(200).json({ message: 'OTP sent to your email.' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Error processing forgot password request' });
            }
        });

        // VERIFY OTP & RESET PASSWORD
        router.post('/reset-password', async (req, res) => {
            const { email, otp, newPassword, role } = req.body;

            let table = '';
            if (role === 'agent') table = 'agents';
            else if (role === 'customer') table = 'customers';
            else if (role === 'admin') table = 'admins';
            else return res.status(400).json({ error: 'Invalid role' });

            try {
                // Verify OTP
                const { data: otpData, error: otpError } = await supabase
                    .from('otps')
                    .select('*')
                    .eq('email', email)
                    .eq('otp', otp)
                    .single();

                if (otpError || !otpData) return res.status(400).json({ error: 'Invalid or expired OTP' });

                if (new Date(otpData.expires_at) < new Date()) {
                    return res.status(400).json({ error: 'OTP has expired' });
                }

                // Update Password
                const hashedPassword = bcrypt.hashSync(newPassword, 8);
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ password: hashedPassword })
                    .eq('email', email);

                if (updateError) throw updateError;

                // Delete OTP after use
                await supabase.from('otps').delete().eq('email', email);

                res.status(200).json({ message: 'Password reset successful.' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Error resetting password' });
            }
        });

        res.status(200).json({ auth: true, token: token, user: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
