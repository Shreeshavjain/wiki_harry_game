import mongoose, { Schema, type InferSchemaType } from "mongoose";

const HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const;
export type HouseName = (typeof HOUSES)[number];

const participantSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [1, "Name cannot be empty"],
      maxlength: [40, "Name cannot exceed 40 characters"],
    },
    usn: {
      type: String,
      required: [true, "USN is required"],
      trim: true,
      uppercase: true,
      minlength: [1, "USN cannot be empty"],
      maxlength: [20, "USN cannot exceed 20 characters"],
    },
    house: {
      type: String,
      required: true,
      enum: {
        values: HOUSES,
        message: "{VALUE} is not a valid house",
      },
    },
    round: {
      type: Number,
      required: true,
      min: 1,
    },
    quizState: {
      type: new Schema({
        score: { type: Number, default: 0 },
        // Future quiz schema fields can be added here (e.g. answeredQuestions array)
      }, { _id: false }),
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one USN per round
participantSchema.index({ usn: 1, round: 1 }, { unique: true });

// Efficient queries for dashboard: filter by round, group by house
participantSchema.index({ round: 1, house: 1 });

export type ParticipantDocument = InferSchemaType<typeof participantSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Participant =
  mongoose.models.Participant ||
  mongoose.model("Participant", participantSchema);

export default Participant;
