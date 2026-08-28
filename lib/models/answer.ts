import mongoose, { Schema, type InferSchemaType } from "mongoose";

const answerSchema = new Schema(
  {
    round: { type: Number, required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionNumber: { type: Number, required: true },
    selectedOption: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    correctRank: { type: Number, default: null },
    pointsAwarded: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Enforce one answer per participant per question
answerSchema.index({ participantId: 1, questionId: 1 }, { unique: true });
answerSchema.index({ round: 1, questionNumber: 1 });

export type AnswerDocument = InferSchemaType<typeof answerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Answer = mongoose.models.Answer || mongoose.model("Answer", answerSchema);

export default Answer;
