import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxLength: 80
    },
    description: {
        type: String,
        required: true
    },
    videoFile: {
        type: String, //Cloudinary Url,
        required: true
    },
    videoId: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, //Cloudinary Url,
        required: true
    },
    thumbnailId: {
        type: String,
        required: true
    },
    isPublished: Boolean,

    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },

    duration: {
        type: Number,
        required: true
    },

    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

videoSchema.plugin(mongooseAggregatePaginate)


export const Video = mongoose.model("Video", videoSchema)