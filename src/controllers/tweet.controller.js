import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweets.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content) {
        throw new ApiError("Content is required", 400)
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    })

    if (!tweet) {
        throw new ApiError("Failed to create tweet", 500)
    }

    res.status(201).json(new ApiResponse("Tweet created successfully", tweet, 200))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
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
                            userName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                },
                likes: {
                    $size: "$likes"
                },
            }
        },
        {
            $project: {
                owner: 1,
                content: 1,
                likes: 1,
                isLiked: 1,
                createdAt: 1
            }
        }
    ])

    if (!tweets) {
        throw new ApiError("No tweets found", 404)
    }

    return res.status(200)
        .json(new ApiResponse("Tweets fetched successfully", tweets, 200))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet id", 400)
    }

    if (!content) {
        throw new ApiError("Content is required", 400)
    }

    const tweet = await Tweet.findById(tweetId)

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to update this tweet", 403)
    }

    const updatedTweet = await Tweet.findOneAndUpdate({ _id: tweetId }, {
        $set: {
            content
        }
    }, { new: true })

    if (!updatedTweet) {
        throw new ApiError("Failed to update tweet", 500)
    }

    return res.status(200).
        json(new ApiResponse("Tweet updated successfully", updatedTweet, 200))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet id", 400)
    }

    const tweet = await Tweet.findById({
        _id: tweetId
    })

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("You are not authorized to delete this tweet", 403)
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(new ApiResponse("Tweet deleted successfully", null, 200))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
} 