import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      (process.env.MONGOPASS
        ? `mongodb+srv://ffsdteam37:${process.env.MONGOPASS}@cluster0.hlq20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
        : undefined);

    if (!mongoUri) {
      throw new Error("Missing MongoDB URI. Set MONGO_URI or MONGOPASS in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};
