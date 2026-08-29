/**
 * Diagnostic script: Tests the exact same MongoDB connection path
 * that the Vercel serverless functions use.
 * 
 * This does NOT print secret values.
 */
const fs = require('fs');
const mongoose = require('mongoose');

async function diagnose() {
  console.log("=== WIKI GAME PRODUCTION DIAGNOSTIC ===\n");

  // 1. Check env file exists
  let envContent;
  try {
    envContent = fs.readFileSync('.env.local', 'utf8');
    console.log("[✓] .env.local file found");
  } catch {
    console.log("[✗] .env.local file NOT found");
    return;
  }

  // 2. Check MONGODB_URI is defined
  const uriMatch = envContent.match(/MONGODB_URI=(.*)/);
  if (!uriMatch) {
    console.log("[✗] MONGODB_URI not found in .env.local");
    return;
  }
  const uri = uriMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  // Parse URI to show structure without exposing credentials
  try {
    const url = new URL(uri);
    console.log(`[✓] MONGODB_URI defined`);
    console.log(`    Protocol: ${url.protocol}`);
    console.log(`    Host: ${url.hostname}`);
    console.log(`    Database: ${url.pathname.replace('/', '')}`);
    console.log(`    Has username: ${url.username ? 'yes' : 'no'}`);
    console.log(`    Has password: ${url.password ? 'yes' : 'no'}`);
    console.log(`    Query params: ${url.search}`);
  } catch (e) {
    console.log(`[!] MONGODB_URI is not a standard URL (may still be valid for mongodb+srv)`);
  }

  // 3. Check SESSION_SECRET
  const sessionMatch = envContent.match(/SESSION_SECRET=(.*)/);
  console.log(`[${sessionMatch ? '✓' : '✗'}] SESSION_SECRET ${sessionMatch ? 'defined' : 'NOT defined'} (length: ${sessionMatch ? sessionMatch[1].trim().replace(/^"|"$/g, '').length : 0})`);

  // 4. Check ADMIN_PASSWORD  
  const adminMatch = envContent.match(/ADMIN_PASSWORD=(.*)/);
  console.log(`[${adminMatch ? '✓' : '✗'}] ADMIN_PASSWORD ${adminMatch ? 'defined' : 'NOT defined'}`);

  // 5. Test MongoDB connection
  console.log("\n--- Testing MongoDB Connection ---");
  const startTime = Date.now();
  try {
    await mongoose.connect(uri, { 
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
    });
    const elapsed = Date.now() - startTime;
    console.log(`[✓] MongoDB connected successfully (${elapsed}ms)`);
    
    // 6. Check database contents
    const db = mongoose.connection.db;
    
    // Check rounds
    const rounds = await db.collection('rounds').find({}).toArray();
    console.log(`\n--- Database State ---`);
    console.log(`[i] Total rounds: ${rounds.length}`);
    for (const r of rounds) {
      console.log(`    Round ${r.roundNumber}: status=${r.status}, gameState=${r.gameState}, currentQuestion=${r.currentQuestion ?? 'MISSING'}, quizAttempt=${r.quizAttempt ?? 'MISSING'}`);
      console.log(`    Counts: G=${r.counts?.gryffindor ?? 0} S=${r.counts?.slytherin ?? 0} R=${r.counts?.ravenclaw ?? 0} H=${r.counts?.hufflepuff ?? 0}`);
    }
    
    // Check active round specifically
    const activeRound = await db.collection('rounds').findOne({ status: 'active' });
    if (activeRound) {
      console.log(`[✓] Active round found: Round ${activeRound.roundNumber}`);
    } else {
      console.log(`[!] No active round found — /api/sort will auto-create one`);
    }
    
    // Check questions
    const questionCount = await db.collection('questions').countDocuments({});
    console.log(`[i] Total questions in database: ${questionCount}`);
    if (activeRound) {
      const activeQuestions = await db.collection('questions').countDocuments({ round: activeRound.roundNumber });
      console.log(`[i] Questions for active round ${activeRound.roundNumber}: ${activeQuestions}`);
    }
    
    // Check participants
    const participantCount = await db.collection('participants').countDocuments({});
    console.log(`[i] Total participants: ${participantCount}`);
    
    // Check indexes
    const roundIndexes = await db.collection('rounds').indexes();
    console.log(`\n--- Indexes ---`);
    console.log(`[i] Round indexes: ${roundIndexes.map(i => i.name).join(', ')}`);
    
    const participantIndexes = await db.collection('participants').indexes();
    console.log(`[i] Participant indexes: ${participantIndexes.map(i => i.name).join(', ')}`);

    // 7. Test transaction support (required for /api/sort)
    console.log(`\n--- Transaction Support ---`);
    try {
      const session = await mongoose.startSession();
      await session.withTransaction(async () => {
        // Just a read — no writes
        await db.collection('rounds').findOne({}, { session });
      });
      await session.endSession();
      console.log(`[✓] Transactions work (replica set confirmed)`);
    } catch (txErr) {
      console.log(`[✗] Transaction FAILED: ${txErr.message}`);
      console.log(`    This means /api/sort WILL FAIL in production!`);
    }

  } catch (connErr) {
    const elapsed = Date.now() - startTime;
    console.log(`[✗] MongoDB connection FAILED after ${elapsed}ms`);
    console.log(`    Error name: ${connErr.name}`);
    console.log(`    Error message: ${connErr.message}`);
    if (connErr.reason) {
      console.log(`    Reason: ${JSON.stringify(connErr.reason, null, 2)}`);
    }
    console.log(`\n    DIAGNOSIS:`);
    if (connErr.message.includes('ENOTFOUND') || connErr.message.includes('getaddrinfo')) {
      console.log(`    → DNS resolution failed. Check the hostname in MONGODB_URI.`);
    } else if (connErr.message.includes('authentication') || connErr.message.includes('auth')) {
      console.log(`    → Authentication failed. Check username/password in MONGODB_URI.`);
    } else if (connErr.message.includes('timeout') || connErr.message.includes('ETIMEDOUT')) {
      console.log(`    → Connection timed out. Check MongoDB Atlas Network Access (IP whitelist).`);
    } else if (connErr.message.includes('ECONNREFUSED')) {
      console.log(`    → Connection refused. Server may be down or IP not whitelisted.`);
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n=== DIAGNOSTIC COMPLETE ===");
}

diagnose().catch(console.error);
