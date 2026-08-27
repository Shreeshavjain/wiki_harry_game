import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ROUND_STATUSES = ["active", "completed"] as const;

const countsSchema = new Schema(
  {
    gryffindor: { type: Number, default: 0, min: 0 },
    slytherin: { type: Number, default: 0, min: 0 },
    ravenclaw: { type: Number, default: 0, min: 0 },
    hufflepuff: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const roundSchema = new Schema(
  {
    roundNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ROUND_STATUSES,
        message: "{VALUE} is not a valid status",
      },
      default: "active",
    },
    counts: {
      type: countsSchema,
      default: () => ({
        gryffindor: 0,
        slytherin: 0,
        ravenclaw: 0,
        hufflepuff: 0,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup for the active round
roundSchema.index({ status: 1 });

export type HouseCounts = InferSchemaType<typeof countsSchema>;

export type RoundDocument = InferSchemaType<typeof roundSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Round = mongoose.models.Round || mongoose.model("Round", roundSchema);

export default Round;
