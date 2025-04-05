import express from 'express';
import path from 'path';

const app = express();

// Add code to serve the uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

export default app; 