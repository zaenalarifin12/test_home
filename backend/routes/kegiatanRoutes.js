const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { Sequelize } = require("sequelize");
const { sequelize } = require("./../config/sequelize");
const DaftarKegiatan = require("../models/daftar_kegiatan")(
  sequelize,
  Sequelize
);
const Pengaturan = require("../models/pengaturan")(sequelize, Sequelize);
const xlsx = require("xlsx");
const { Op } = require("sequelize");

// GET all activities
router.get("/", async (req, res) => {
  try {
    const { nama_proyek } = req.query; // Assuming `nama_proyek` is provided as a query parameter

    let whereCondition = {};

    if (nama_proyek) {
      // If nama_proyek is provided as a comma-separated string, split it into an array
      const namaProyekArray = nama_proyek.split(",");
      whereCondition.nama_proyek = {
        [Op.in]: namaProyekArray,
      };
    }

    const daftarKegiatan = await DaftarKegiatan.findAll({
      where: whereCondition,
      order: [["id", "DESC"]],
    });
    const pengaturan = await Pengaturan.findOne();

    // Initialize variables to calculate total overtime and income
    let totalWork = 0;
    let totalOvertime = 0;
    let totalOvertimeIncome = 0;

    const activitiesWithTotalHours = daftarKegiatan.map((activity) => {
      const startTime = new Date(
        activity.tanggal_mulai + "T" + activity.waktu_mulai
      );
      const endTime = new Date(
        activity.tanggal_berakhir + "T" + activity.waktu_berakhir
      );
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
        totalOvertimeIncome += overtimeHours * pengaturan.rate * 0.3;
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
    const formattedIncome = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(income);
    const formattedOvertimeIncome = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(totalOvertimeIncome);

    const activityResult = {
      data: activitiesWithTotalHours,
      totalWork: `${totalWork.toFixed(1)} Jam`,
      overtime: `${totalOvertime.toFixed(1)} Jam`,
      income: formattedIncome,
      overtimeIncome: formattedOvertimeIncome,
    };

    res.json(activityResult);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// GET activity by ID
router.get("/:id", async (req, res) => {
  try {
    const activity = await DaftarKegiatan.findByPk(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Given start and end times in the format "HH:mm:ss"
    const startTimeString = activity.waktu_mulai;
    const endTimeString = activity.waktu_berakhir;

    // Convert start and end times to Date objects
    const startTime = new Date(`2000-01-01T${startTimeString}`);
    const endTime = new Date(`2000-01-01T${endTimeString}`);

    // Calculate duration in milliseconds
    const durationInMilliseconds = endTime - startTime;

    // Convert milliseconds to hours and minutes
    const hours = Math.floor(durationInMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor(
      (durationInMilliseconds % (1000 * 60 * 60)) / (1000 * 60)
    )
      .toString()
      .padStart(2, "0");

    const activityWithDuration = {
      ...activity,
      duration: `${hours}:${minutes}`,
    };
    const result = {
      id: activity.id,
      judul_kegiatan: activity.judul_kegiatan,
      nama_proyek: activity.nama_proyek,
      tanggal_mulai: activity.tanggal_mulai,
      tanggal_berakhir: activity.tanggal_berakhir,
      waktu_mulai: activity.waktu_mulai,
      waktu_berakhir: activity.waktu_berakhir,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      hour: hours,
      minute: minutes,
    };
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// POST endpoint for creating a new activity
router.post("/", async (req, res) => {
  try {
    const {
      judul_kegiatan,
      nama_proyek,
      tanggal_mulai,
      tanggal_berakhir,
      waktu_mulai,
      waktu_berakhir,
    } = req.body;

    const { error } = Joi.object({
      judul_kegiatan: Joi.string().required(),
      nama_proyek: Joi.string().required(),
      tanggal_mulai: Joi.date().iso().required(),
      tanggal_berakhir: Joi.date().iso().required(),
      waktu_mulai: Joi.string().required(),
      waktu_berakhir: Joi.string().required(),
    }).validate({
      judul_kegiatan,
      nama_proyek,
      tanggal_mulai,
      tanggal_berakhir,
      waktu_mulai,
      waktu_berakhir,
    });

    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const daftarKegiatan = await DaftarKegiatan.create({
      judul_kegiatan,
      nama_proyek,
      tanggal_mulai,
      tanggal_berakhir,
      waktu_mulai,
      waktu_berakhir,
    });

    res.json(daftarKegiatan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// PUT endpoint for updating an activity
router.put("/:id", async (req, res) => {
  try {
    const {
      judul_kegiatan,
      nama_proyek,
      tanggal_mulai,
      tanggal_berakhir,
      waktu_mulai,
      waktu_berakhir,
    } = req.body;

    const { error } = Joi.object({
      judul_kegiatan: Joi.string().required(),
      nama_proyek: Joi.string().required(),
      tanggal_mulai: Joi.date().iso().required(),
      tanggal_berakhir: Joi.date().iso().required(),
      waktu_mulai: Joi.string().required(),
      waktu_berakhir: Joi.string().required(),
    }).validate({
      judul_kegiatan,
      nama_proyek,
      tanggal_mulai,
      tanggal_berakhir,
      waktu_mulai,
      waktu_berakhir,
    });

    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const updatedKegiatan = await DaftarKegiatan.update(
      {
        judul_kegiatan,
        nama_proyek,
        tanggal_mulai,
        tanggal_berakhir,
        waktu_mulai,
        waktu_berakhir,
      },
      {
        where: {
          id: req.params.id,
        },
        returning: true, // This option is used to return the updated record
      }
    );
    res.json(updatedKegiatan[1][0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// DELETE endpoint for deleting an activity
router.delete("/:id", async (req, res) => {
  try {
    const deletedKegiatan = await DaftarKegiatan.destroy({
      where: {
        id: req.params.id,
      },
    });

    if (!deletedKegiatan) {
      return res.status(404).send("Activity not found");
    }

    res.json(deletedKegiatan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
