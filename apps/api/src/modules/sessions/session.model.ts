import mongoose, { Document, Schema, Types } from 'mongoose';
import { Kit } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// TypeScript interface
// ---------------------------------------------------------------------------

export interface ISessionDocument extends Document {
  /** High-entropy opaque session identifier (UUID v4 format) */
  sessionId: string;
  /** The complete Appendix A kit payload. */
  kit: Kit;
  /** Question confidence tracking (optional). Stored outside kit payload to preserve Appendix A compliance. */
  questionConfidence?: Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>;
  /** Question order tracking (optional). Stored outside kit payload to preserve Appendix A compliance. */
  questionOrder?: string[];
  /** Flashcard confidence tracking (optional). Stored outside kit payload to preserve Appendix A compliance. */
  flashcardConfidence?: Record<string, 'easy' | 'medium' | 'hard'>;
  /** Timestamp when the session was created. */
  createdAt: Date;
  /** Timestamp when the session was last accessed. Used for TTL cleanup. */
  lastAccessedAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------

const SessionDocumentSchema = new Schema<ISessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    /**
     * The Appendix A kit payload stored as a Mixed/subdocument.
     * Mongoose validates structure at the application layer via Zod before save.
     */
    kit: {
      type: Schema.Types.Mixed,
      required: true,
    },
    /**
     * Question confidence tracking (optional).
     * Maps question ID to confidence level. Stored outside kit payload to preserve Appendix A compliance.
     */
    questionConfidence: {
      type: Map,
      of: String,
      default: undefined,
    },
    /**
     * Question order tracking (optional).
     * Ordered array of question IDs. Stored outside kit payload to preserve Appendix A compliance.
     */
    questionOrder: {
      type: [String],
      default: undefined,
    },
    /**
     * Flashcard confidence tracking (optional).
     * Maps flashcard ID to confidence tier. Stored outside kit payload to preserve Appendix A compliance.
     */
    flashcardConfidence: {
      type: Map,
      of: String,
      default: undefined,
    },
    /**
     * Last accessed timestamp for TTL cleanup.
     * Sessions not accessed within 7 days are considered stale.
     */
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: 7 * 24 * 60 * 60 }, // 7 days TTL
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

/**
 * Generation Session model.
 *
 * Stores unsaved generated kits with high-entropy session IDs.
 * Sessions are anonymous (no userId) and have a 7-day TTL.
 * When a user saves a session, it is converted to a KitDocument with their userId.
 */
export const SessionDocumentModel = mongoose.model<ISessionDocument>('SessionDocument', SessionDocumentSchema);
