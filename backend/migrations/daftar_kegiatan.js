'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('daftar_kegiatan', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            judul_kegiatan: {
                type: Sequelize.STRING,
                allowNull: false
            },
            nama_proyek: {
                type: Sequelize.STRING,
                allowNull: false
            },
            tanggal_mulai: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            tanggal_berakhir: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            waktu_mulai: {
                type: Sequelize.TIME,
                allowNull: false
            },
            waktu_berakhir: {
                type: Sequelize.TIME,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('daftar_kegiatan');
    }
};
