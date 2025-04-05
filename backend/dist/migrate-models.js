"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("./models");
async function syncDatabase() {
    try {
        console.log('Starting database synchronization...');
        // Force: true will drop tables before recreating them
        // In production, you would want to use migrations instead
        // or set force to false to prevent data loss
        await models_1.sequelize.sync({ force: process.env.NODE_ENV !== 'production' });
        console.log('Database synchronized successfully');
    }
    catch (error) {
        console.error('Failed to synchronize database:', error);
        process.exit(1);
    }
}
// Run the sync function
syncDatabase().then(() => {
    console.log('Database migration completed');
    process.exit(0);
}).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
