'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DaftarKegiatan extends Model {
        static associate(models) {}
    }
    DaftarKegiatan.init({
        judul_kegiatan: {
            type: DataTypes.STRING,
            allowNull: false
        },
        nama_proyek: {
            type: DataTypes.STRING,
            allowNull: false
        },
        tanggal_mulai: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        tanggal_berakhir: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        waktu_mulai: {
            type: DataTypes.TIME,
            allowNull: false
        },
        waktu_berakhir: {
            type: DataTypes.TIME,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'DaftarKegiatan',
        tableName: 'daftar_kegiatan'
    });
    return DaftarKegiatan;
};
