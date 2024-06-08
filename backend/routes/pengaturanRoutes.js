// routes/pengaturanRoutes.js

const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');
const { sequelize } = require('./../config/sequelize');

const Pengaturan = require('../models/pengaturan')(sequelize, Sequelize);
const Joi = require('joi');


// POST route to delete existing pengaturan data and then create a new one in a transaction
router.post('/', async (req, res) => {

    const t = await sequelize.transaction();

    try {
        const { nama_karyawan, rate } = req.body;
        const { error } = Joi.object({
            nama_karyawan: Joi.string().required(),
            rate: Joi.number().required()
        }).validate({ nama_karyawan, rate });
        if (error) {
            return res.status(400).send(error.details[0].message);
        }


        // Delete existing pengaturan data within the transaction
        await Pengaturan.destroy({ where: {}, transaction: t });

        // Create new pengaturan data within the transaction
        const pengaturan = await Pengaturan.create({ nama_karyawan, rate }, { transaction: t });

        // Commit the transaction
        await t.commit();

        res.json(pengaturan);
    } catch (err) {
        // If an error occurs, rollback the transaction
        await t.rollback();

        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// GET route to fetch all pengaturan data
router.get('/', async (req, res) => {
    try {
        const pengaturan = await Pengaturan.findOne();
        res.json(pengaturan);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
