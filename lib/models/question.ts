import mongoose, { Schema, type InferSchemaType } from "mongoose";

const questionSchema = new Schema(
  {
    round: {
      type: Number,
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    option_a: {
      type: String,
      required: true,
      trim: true,
    },
    option_b: {
      type: String,
      required: true,
      trim: true,
    },
    option_c: {
      type: String,
      required: true,
      trim: true,
    },
    option_d: {
      type: String,
      required: true,
      trim: true,
    },
    correct_option: {
      type: String,
      required: true,
      enum: {
        values: ["A", "B", "C", "D"],
        message: "{VALUE} is not a valid correct option",
      },
    },
    correctAnswersCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure uniqueness of questionNumber per round
questionSchema.index({ round: 1, questionNumber: 1 }, { unique: true });

export type QuestionDocument = InferSchemaType<typeof questionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

export default Question;
