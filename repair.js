const fs = require('fs');
const mongoose = require('mongoose');

async function repair() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const mongoUriMatch = envFile.match(/MONGODB_URI=(.*)/);
  if (!mongoUriMatch) return;
  const uri = mongoUriMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const round = await db.collection('rounds').findOne({ status: 'active' });
  if (round && round.gameState === 'LIVE' && !round.currentQuestion) {
    const firstQ = await db.collection('questions').findOne({ round: round.roundNumber }, { sort: { questionNumber: 1 } });
    if (firstQ) {
      console.log('Found broken LIVE round. Repairing with question:', firstQ.questionNumber);
      const now = new Date();
      const endsAt = new Date(now.getTime() + 63000);
      await db.collection('rounds').updateOne(
        { _id: round._id },
        {
          $set: {
            currentQuestion: firstQ.questionNumber,
            questionStartedAt: now,
            questionEndsAt: endsAt,
          }
        }
      );
      console.log('Successfully repaired!');
    } else {
      console.log('No questions found to repair with.');
    }
  } else {
    console.log('No repair needed.', round);
  }

  mongoose.disconnect();
}
repair().catch(console.error);
