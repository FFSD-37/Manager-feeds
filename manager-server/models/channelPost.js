import mongoose from "mongoose";

const channelPostschema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['Reels', 'Img'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: [true, 'channel is required']
    },
    category: {
        type: String,
        required: [true, 'category is required']
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    isArchived: {
        type: Boolean,
        default: false
    },
    warnings: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const channelPost = mongoose.model('channelPost', channelPostschema);

export default channelPost;