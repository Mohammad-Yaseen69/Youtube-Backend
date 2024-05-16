import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Likes } from "../models/likes.model.js"
import { Comment } from "../models/comments.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    let pipeline = []

    pipeline.push({
        $match: {
            isPublished: true
        }
    })

    if (query) {
        pipeline.push({
            $search: {
                index: "search_index",
                text: {
                    query: query,
                    path: ["title", "description"]
                }
            }
        })
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError("Invalid user id", 400)
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        })
    }
    else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })
    }

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
            pipeline: [
                {
                    $project: {
                        _id: 1,
                        userName: 1,
                        avatar: 1,
                    }
                }
            ]
        }
    })

    pipeline.push({
        $unwind: "$ownerDetails"
    })

    pipeline.push({
        $project: {
            ownerDetails: 1,
            duration: 1,
            title: 1,
            description: 1,
            createdAt: 1,
            videoFile: 1,
            thumbnail: 1,
            views: 1,
        }
    })

    const aggregate = Video.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videos = await Video.aggregatePaginate(aggregate, options)

    console.log(pipeline)
    if (!videos) throw new ApiError("Error fetching videos", 500)

    return res.status(200)
        .json(new ApiResponse("Videos fetched successfully", videos, 200))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError("Please provide title and description", 400)
    }

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if (!videoLocalPath) {
        throw new ApiError("Please provide video", 400)
    }

    if (!thumbnailLocalPath) {
        throw new ApiError("Please provide thumbnail", 400)
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!video || !thumbnail) {
        throw new ApiError("Error uploading video or thumbnail", 500)
    }

    if (video?.resource_type != "video") throw new ApiError("Invalid video file", 400)
    if (thumbnail?.resource_type != "image") throw new ApiError("Invalid thumbnail file", 400)


    const videoDoc = await Video.create({
        title,
        description,
        videoFile: video?.url,
        thumbnail: thumbnail?.url,
        videoId: video?.public_id,
        isPublished: true,
        thumbnailId: thumbnail?.public_id,
        owner: req?.user?._id,
        duration: video?.duration,
    })

    if (!videoDoc) {
        throw new ApiError("Error creating video", 500)
    }

    return res.status(200)
        .json(new ApiResponse("Video uploaded successfully", videoDoc, 200))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError("Invalid video id", 400);

    const videoDetails = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req?.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1,
                            userName: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req?.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                },
                dislikes: {
                    $size: "$dislikes"
                },
                isDisliked: {
                    $cond: {
                        if: {
                            $in: [req?.user?._id, "$dislikes.dislikedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                views: 1,
                likes: 1,
                isLiked: 1,
                dislikes: 1,
                isDisliked: 1,
                createdAt: 1,
                isPublished: 1,
                updatedAt: 1,
                owner: "$ownerDetails",
                duration: 1
            }
        }
    ])


    if (!videoDetails) throw new ApiError("Error fetching video details", 500)

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })
    return res.status(200)
        .json(new ApiResponse("Video details fetched successfully", videoDetails, 200))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const query = {}

    if (!isValidObjectId(videoId)) throw new ApiError("Invalid video id", 400);
    if (!(title || description)) throw new ApiError("Please provide title or description", 400);

    const thumbnailFile = req.file?.path // Renamed to thumbnailFile to avoid conflict
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    if (req.user?._id.toString() !== video.owner.toString()) {
        throw new ApiError("You are not the owner of the video", 401)
    }

    if (thumbnailFile) {
        const thumbnail = await uploadOnCloudinary(thumbnailFile)

        if (!thumbnail) throw new ApiError("Error uploading thumbnail", 500)

        query.thumbnail = thumbnail.url
        query.thumbnailId = thumbnail.public_id
    }

    if (title) query.title = title
    if (description) query.description = description

    const updatedVideo = await Video.findByIdAndUpdate(videoId, query, { new: true })

    if (!updatedVideo) {
        throw new ApiError("Error updating video", 500)
    }

    if (thumbnailFile) {
        await deleteFile(video.thumbnailId)
    }

    return res.status(200)
        .json(new ApiResponse("Video updated successfully", updatedVideo, 200))
})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId: videoDocumentId } = req.params

    if (!isValidObjectId) throw new ApiError("Invalid video id", 400);
    const video = await Video.findById(videoDocumentId)

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not the owner of video", 401)
    }


    await deleteFile(video?.videoId, "video")
    await deleteFile(video?.thumbnailId)

    await Video.deleteOne({
        _id: videoDocumentId
    })

    await Likes.deleteMany({
        video: videoDocumentId
    })

    await Comment.deleteMany({
        video: videoDocumentId
    })

    return res.status(200)
        .json(new ApiResponse("Video deleted successfully", {}, 200))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId) throw new ApiError("Invalid video id", 400);

    const video = await Video.findById(videoId)

    if (!video) throw new ApiError("Video not found", 404)

    if (video?.owner.toString() !== req.user?._id.toString()) throw new ApiError("You are not the owner of video", 401)

    const toggle = await Video.findByIdAndUpdate(videoId, {
        isPublished: !video?.isPublished
    })

    if (!toggle) throw new ApiError("Error toggling publish status", 500)

    return res.status(200)
        .json(new ApiResponse("Published toggled successfully", {}, 200))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}