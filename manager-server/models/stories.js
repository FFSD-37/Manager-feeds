import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  likes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true 
});

storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Story = mongoose.model('stories', storySchema);
export default Story;