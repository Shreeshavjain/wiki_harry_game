import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";
import Papa from "papaparse";

export async function POST(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid CSV format", details: result.errors },
        { status: 400 }
      );
    }

    const rows = result.data as any[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    const errors: string[] = [];
    const questionsToInsert: any[] = [];
    const seenNumbers = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for header, +1 for 0-index

      const qNum = parseInt(row.question_number, 10);
      if (isNaN(qNum)) {
        errors.push(`Row ${rowNum}: question_number must be a number`);
        continue;
      }
      if (seenNumbers.has(qNum)) {
        errors.push(`Row ${rowNum}: Duplicate question_number ${qNum}`);
      }
      seenNumbers.add(qNum);

      if (!row.question?.trim()) errors.push(`Row ${rowNum}: question is missing`);
      if (!row.option_a?.trim()) errors.push(`Row ${rowNum}: option_a is missing`);
      if (!row.option_b?.trim()) errors.push(`Row ${rowNum}: option_b is missing`);
      if (!row.option_c?.trim()) errors.push(`Row ${rowNum}: option_c is missing`);
      if (!row.option_d?.trim()) errors.push(`Row ${rowNum}: option_d is missing`);

      const correct = row.correct_option?.trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(correct)) {
        errors.push(`Row ${rowNum}: correct_option must be A, B, C, or D`);
      }

      questionsToInsert.push({
        questionNumber: qNum,
        question: row.question?.trim(),
        option_a: row.option_a?.trim(),
        option_b: row.option_b?.trim(),
        option_c: row.option_c?.trim(),
        option_d: row.option_d?.trim(),
        correct_option: correct,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 });
    }

    if (round.gameState === "LIVE" || round.gameState === "COMPLETED") {
      return NextResponse.json({ error: "Cannot upload questions while quiz is live or completed" }, { status: 400 });
    }

    // Assign round number to all questions
    const roundNumber = round.roundNumber;
    questionsToInsert.forEach((q) => (q.round = roundNumber));

    // Delete old questions for this round
    await Question.deleteMany({ round: roundNumber });

    // Insert new questions
    await Question.insertMany(questionsToInsert);

    // Update game state
    round.gameState = "QUESTIONS_READY";
    await round.save();

    return NextResponse.json({
      success: true,
      message: `${questionsToInsert.length} questions uploaded successfully`,
      count: questionsToInsert.length,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
