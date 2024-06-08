const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const cors = require('cors');

require('dotenv').config();
const { sequelize } = require('./config/sequelize');

// Routes
const pengaturanRoutes = require('./routes/pengaturanRoutes');
const kegiatanRoutes = require('./routes/kegiatanRoutes');
const kegiatanExportRoutes = require('./routes/export');

app.use(express.json());
app.use(cors());

app.use('/pengaturan', pengaturanRoutes);
app.use('/daftar-kegiatan', kegiatanRoutes);
app.use('/daftar-kegiatan-export', kegiatanExportRoutes);


app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});


