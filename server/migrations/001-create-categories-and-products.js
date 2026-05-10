/**
 * Migration script for adding categories collection and ensuring products have category field
 * Usage: node server/migrations/001-create-categories-and-products.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const connectUri = process.env.CONNECT_DB || process.env.MONGO_URI || 'mongodb://localhost:27017/mac-shop';

async function run() {
  await mongoose.connect(connectUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection;

  try {
    // Ensure categories collection exists by creating index on slug
    await db.createCollection('categories').catch(() => {});
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });

    // Ensure existing products have category field (set to null if missing)
    await db.collection('products').updateMany({ category: { $exists: false } }, { $set: { category: null } });

    console.log('Migration completed: categories collection ensured and products updated');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
