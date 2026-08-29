const mongoose = require('mongoose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let uri = env.split('\n').find(line => line.startsWith('MONGODB_URI=')).split('=')[1].trim();
if (uri.startsWith('"')) uri = uri.slice(1, -1);
if (uri.startsWith('\'')) uri = uri.slice(1, -1);
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const round = await db.collection('rounds').findOne({ status: 'active' });
  console.log('projectorDisplay in DB:', round.projectorDisplay);
  process.exit(0);
}).catch(console.error);
