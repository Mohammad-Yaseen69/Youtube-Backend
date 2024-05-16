import mongoose, { isValidObjectId } from "mongoose"
import { Likes } from "../models/likes.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video id", 400)
    }

    const likedAlready = await Likes.findOne({
        video: videoId,
        likedBy: req.user._id
    })


    if (likedAlready) {
        const like = await Likes.deleteOne({
            video: videoId,
            likedBy: req.user._id
        })
        if (!like) {
            throw new ApiError("Error while unliking video", 500)
        }
        return res.status(200).json(new ApiResponse("Video unliked", {
            isLiked: false
        }, 200))
    }

    const like = await Likes.create({
        video: videoId,
        likedBy: req.user._id
    })

    if (!like) {
        throw new ApiError("Error while liking video", 500)
    }

    return res.status(200).json(new ApiResponse("Video liked", {
        isLiked: true
    }, 200))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError("Invalid comment id", 400)
    }

    const likedAlready = await Likes.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if (likedAlready) {
        const like = await Likes.deleteOne({
            comment: commentId,
            likedBy: req.user._id
        })

        if (!like) {
            throw new ApiError("Error while unliking comment", 500)
        }

        return res.status(200).json(new ApiResponse("Comment unliked", {
            isLiked: false
        }, 200))
    }

    const like = await Likes.create({
        comment: commentId,
        likedBy: req.user._id
    })

    if (!like) {
        throw new ApiError("Error while liking comment", 500)
    }

    return res.status(200).json(new ApiResponse("Comment liked", {
        isLiked: true
    }, 200))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params


    if (!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet id", 400)
    }

    const likedAlready = await Likes.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (likedAlready) {
        const like = await Likes.deleteOne({
            tweet: tweetId,
            likedBy: req.user._id
        })

        if (!like) {
            throw new ApiError("Error while unliking tweet", 500)
        }

        return res.status(200).json(new ApiResponse("Tweet unliked", {
            isLiked: false
        }, 200))
    }

    const like = await Likes.create({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (!like) {
        throw new ApiError("Error while liking tweet", 500)
    }

    return res.status(200).json(new ApiResponse("Tweet liked", {
        isLiked: true
    }, 200))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Likes.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                },
                            ]
                        },
                    },
                    {
                        $project : {
                            _id : 1,
                            owner : 1,
                            title : 1,
                            description : 1,
                            thumbnail : 1,
                            views : 1,
                            likes : 1,
                            createdAt : 1,
                            duration : 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                video: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse("Liked videos", likedVideos, 200))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}