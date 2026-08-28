const fs = require('fs');
const mongoose = require('mongoose');

async function check() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const mongoUriMatch = envFile.match(/MONGODB_URI=(.*)/);
  if (!mongoUriMatch) return;
  const uri = mongoUriMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const allQuestions = await db.collection('questions').find({}).toArray();
  console.log('TOTAL QUESTIONS IN DB: ' + allQuestions.length);
  const roundCounts = {};
  for (const q of allQuestions) {
    roundCounts[q.round] = (roundCounts[q.round] || 0) + 1;
  }
  console.log('QUESTIONS PER ROUND:', roundCounts);
  
  const activeRound = await db.collection('rounds').findOne({ status: 'active' });
  console.log('ACTIVE ROUND:', activeRound);
  mongoose.disconnect();
}
check().catch(console.error);
