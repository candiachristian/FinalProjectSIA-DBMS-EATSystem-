const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event Attendance Tracking System server is running'
  });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});