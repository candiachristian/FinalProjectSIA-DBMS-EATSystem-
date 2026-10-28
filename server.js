require('dotenv').config();

const express = require('express');
const path = require('path');
const authRoutes = require('./src/routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', authRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event Attendance Tracking System server is running'
  });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log('Server running at http://localhost:${PORT}');
});