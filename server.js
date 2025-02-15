const express = require('express');
const cors = require('cors');
const gameRoutes = require('./src/routes/game');
const db = require('../server/database/db'); // Import database connection

const app = express();
const port = 5000;
db.connect();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests
app.use('/game', gameRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
