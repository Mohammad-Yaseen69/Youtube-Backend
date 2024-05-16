import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Likes } from "../models/likes.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const stats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "totalLikes"
            }
        },
        {
            $addFields: {
                totalLikes: { $size: "$totalLikes" }
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
                totalLikes: { $sum: "$totalLikes" },
            }
        },
        {
            $project: {
                totalViews: 1,
                totalVideos: 1,
                totalLikes: 1
            }
        },
    ])

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: { $sum: 1 }
            }
        }
    ])

    const statsObj = {
        totalViews: stats[0]?.totalViews || 0,
        totalSubscribers: subscribers[0]?.totalSubscribers || 0,
        totalVideos: stats[0]?.totalVideos || 0,
        totalLikes: stats[0]?.totalLikes || 0
    }

    return res.status(200)
        .json(new ApiResponse("Channel stats fetched successfully", statsObj, 200))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                publishDate: {
                    $dateToParts : {
                        date: "$createdAt"
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                likeCount: 1,
                isPublished: 1,
                publishDate: {
                    day: 1,
                    month: 1,
                    year: 1
                }
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse("Channel videos fetched successfully", videos, 200))
})

export {
    getChannelStats,
    getChannelVideos
}