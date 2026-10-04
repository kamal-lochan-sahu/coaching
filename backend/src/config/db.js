import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set — add it to backend/.env (or the Render env vars)");
    process.exit(1);
    return;
  }

  // 'error' is registered BEFORE connecting so startup errors are logged too.
  mongoose.connection.on("error", (err) => {
    console.error(`❌ MongoDB error: ${err.message}`);
  });

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Only after a successful connect — otherwise a failed startup would print a
    // misleading "attempting reconnect" line right before exiting.
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting reconnect...");
    });
    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
