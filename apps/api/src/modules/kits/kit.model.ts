import mongoose, { Document, Schema, Types } from 'mongoose';
import { Kit } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// TypeScript interface
// ---------------------------------------------------------------------------

export interface IKitDocument extends Document {
  /** Reference to the owning user. Derived exclusively from JWT — never from client input. */
  userId: Types.ObjectId;
  /** The complete Appendix A kit payload, stored verbatim. */
  kit: Kit;
  /** Question confidence tracking (optional). Maps question ID to confidence level. Stored outside kit payload to preserve Appendix A compliance. */
  questionConfidence?: Record<string, 'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'>;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------

const KitDocumentSchema = new Schema<IKitDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,          // Fast per-user list queries
    },
    /**
     * The Appendix A kit payload stored as a Mixed/subdocument.
     * Mongoose validates structure at the application layer via Zod before save.
     * Mixed type is used intentionally to avoid re-declaring the entire Appendix A
     * schema in Mongoose (which would require keeping two schemas in sync).
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
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Compound index: all queries must filter by userId so MongoDB can use this
// index for both list (userId) and get-by-id (userId + _id) operations.
KitDocumentSchema.index({ userId: 1, createdAt: -1 });

/**
 * Saved Kit model.
 *
 * Persistence metadata (userId, _id, createdAt, updatedAt) lives outside the
 * Appendix A payload so the kit object itself is never altered by saving.
 */
export const KitDocumentModel = mongoose.model<IKitDocument>('KitDocument', KitDocumentSchema);
