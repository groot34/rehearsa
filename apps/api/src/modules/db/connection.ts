import mongoose from 'mongoose';

let isConnected = false;

/**
 * Establishes a singleton Mongoose connection.
 *
 * Calling this multiple times is safe — subsequent calls are no-ops once
 * the connection is open.  Tests that use mongodb-memory-server should call
 * mongoose.connect() directly with the in-memory URI and disconnect in
 * afterAll; they should NOT call connectToDatabase() so as not to conflict
 * with the shared connection state.
 */
export async function connectToDatabase(uri: string): Promise<void> {
  if (isConnected) return;

  await mongoose.connect(uri, {
    // Recommended settings for production stability
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;
}

/**
 * Closes the Mongoose connection and resets the internal flag.
 * Primarily used in tests and graceful shutdown handlers.
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
