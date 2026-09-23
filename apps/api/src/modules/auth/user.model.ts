import mongoose, { Document, Schema } from 'mongoose';

// ---------------------------------------------------------------------------
// TypeScript interface for the User document
// ---------------------------------------------------------------------------

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Never returned in query results by default
      select: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Email uniqueness is enforced by { unique: true } on the field definition above.
// A separate .index() call is intentionally omitted to avoid the duplicate-index warning.

/**
 * User model.
 * passwordHash is excluded from query results by default (select: false).
 * Use .select('+passwordHash') explicitly when you need to verify a password.
 */
export const UserModel = mongoose.model<IUser>('User', UserSchema);
