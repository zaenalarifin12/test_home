'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Pengaturan extends Model {
        static associate(models) {}
    }
    Pengaturan.init({
        nama_karyawan: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        rate: {
            type: DataTypes.NUMERIC,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Pengaturan',
        tableName: 'pengaturan'
    });
    return Pengaturan;
};
