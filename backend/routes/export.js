const express = require('express');
const router = express.Router();
const Joi = require('joi');
const {Sequelize} = require('sequelize');
const {sequelize} = require('./../config/sequelize');
const DaftarKegiatan = require('../models/daftar_kegiatan')(sequelize, Sequelize);
const Pengaturan = require('../models/pengaturan')(sequelize, Sequelize);
const xlsx = require('xlsx');


router.get('/export', async (req, res) => {
    try {
        const { nama_proyek } = req.query; // Assuming `nama_proyek` is provided as a query parameter

        // Fetch activities with optional filter by nama_proyek
        const whereCondition = nama_proyek ? { nama_proyek: nama_proyek } : {};
        const daftarKegiatan = await DaftarKegiatan.findAll({
            where: whereCondition,
            order: [['id', 'DESC']]
        });
        const pengaturan = await Pengaturan.findOne();

        // Initialize variables to calculate total overtime and income
        let totalWork = 0;
        let totalOvertime = 0;
        let totalOvertimeIncome = 0;

        const activitiesWithTotalHours = daftarKegiatan.map(activity => {
            const startTime = new Date(activity.tanggal_mulai + 'T' + activity.waktu_mulai);
            const endTime = new Date(activity.tanggal_berakhir + 'T' + activity.waktu_berakhir);
            const totalHours = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours

            // Calculate formatted total hours
            const formattedTotalHours = totalHours.toFixed(1);
            totalWork += parseFloat(formattedTotalHours);

            // Calculate overtime hours if totalHours > 8
            if (totalHours > 8) {
                // Define work hours boundaries
                const workStart = new Date(startTime);
                workStart.setHours(9, 0, 0, 0);
                const workEnd = new Date(endTime);
                workEnd.setHours(17, 0, 0, 0);

                let overtimeHours = 0;

                // Check if the activity starts before work hours or ends after work hours
                if (startTime < workStart) {
                    overtimeHours += (workStart - startTime) / (1000 * 60 * 60); // before work hours
                }
                if (endTime > workEnd) {
                    overtimeHours += (endTime - workEnd) / (1000 * 60 * 60); // after work hours
                }

                // Add overtime hours to totalOvertime
                totalOvertime += overtimeHours;

                // Calculate overtime income
                totalOvertimeIncome += (overtimeHours * pengaturan.rate) * 0.30;
            }

            return {
                id: activity.id,
                judul_kegiatan: activity.judul_kegiatan,
                nama_proyek: activity.nama_proyek,
                tanggal_mulai: activity.tanggal_mulai,
                tanggal_berakhir: activity.tanggal_berakhir,
                waktu_mulai: activity.waktu_mulai,
                waktu_berakhir: activity.waktu_berakhir,
                total_hours: formattedTotalHours, // Add formatted total hours to the activity object
                createdAt: activity.createdAt,
                updatedAt: activity.updatedAt,
            };
        });

        const income = totalWork * pengaturan.rate;
        const formattedIncome = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(income);
        const formattedOvertimeIncome = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalOvertimeIncome);

        const activityResult = {
            data: activitiesWithTotalHours,
            totalWork: `${totalWork.toFixed(1)} Jam`,
            overtime: `${totalOvertime.toFixed(1)} Jam`,
            income: formattedIncome,
            overtimeIncome: formattedOvertimeIncome
        };

        // Create a new workbook and worksheet
        const wb = xlsx.utils.book_new();
        const wsData = [
            ["ID", "Judul Kegiatan", "Nama Proyek", "Tanggal Mulai", "Tanggal Berakhir", "Waktu Mulai", "Waktu Berakhir", "Total Hours", "Created At", "Updated At"],
            ...activitiesWithTotalHours.map(activity => [
                activity.id,
                activity.judul_kegiatan,
                activity.nama_proyek,
                activity.tanggal_mulai,
                activity.tanggal_berakhir,
                activity.waktu_mulai,
                activity.waktu_berakhir,
                activity.total_hours,
                activity.createdAt,
                activity.updatedAt
            ])
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);

        // Add totals at the bottom
        const totals = [
            ["Total Work", totalWork.toFixed(1) + " Jam"],
            ["Total Overtime", totalOvertime.toFixed(1) + " Jam"],
            ["Total Income", formattedIncome],
            ["Total Overtime Income", formattedOvertimeIncome]
        ];
        totals.forEach((total, index) => {
            const cellRef = xlsx.utils.encode_cell({ c: 0, r: wsData.length + index });
            ws[cellRef] = { v: total[0] };
            const valueCellRef = xlsx.utils.encode_cell({ c: 1, r: wsData.length + index });
            ws[valueCellRef] = { v: total[1] };
        });

        // Append worksheet to workbook
        xlsx.utils.book_append_sheet(wb, ws, "Activities");

        // Write workbook to buffer
        const wbBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers and send the buffer
        res.setHeader('Content-Disposition', 'attachment; filename="activities.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(wbBuffer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;
