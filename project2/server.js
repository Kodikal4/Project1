// server.js
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// server.js updates
const productRoutes = require('./productRoutes');
const clientRoutes = require('./clientRoutes');
const requestRoutes = require('./requestRoutes');
const quoteRoutes = require('./quotes');
const billingRoutes = require('./billing');

app.use('/api', productRoutes);
app.use('/api', clientRoutes);
app.use('/api', requestRoutes);
app.use('/api', quoteRoutes);
app.use('/api', billingRoutes);

// Serve static uploaded project photos folder
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/', (req, res) => {
    json_response = { status: 'Server is running', business: 'Anna Johnson Flooring Sales & Installation' };
    res.json(json_response);
});

// Import and mount routes (as you build them out)
// const requestRoutes = require('./routes/requestRoutes');
// app.use('/api', requestRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
