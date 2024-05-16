import mongoose, { Schema, isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Dislikes } from "../models/dislike.model.js"
import { Likes } from "../models/likes.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleDislikeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video id", 400)
    }

    const isAlreadyDisliked = await Dislikes.findOne({
        video: videoId,
        dislikedBy: req.user?._id
    })

    if (isAlreadyDisliked) {
        await Dislikes.deleteOne({
            video: videoId,
            dislikedBy: req.user?._id
        })

        return res.status(200).json(new ApiResponse("Video Disliked removed successfully", null, 200))
    }

    await Dislikes.create({
        video: videoId,
        dislikedBy: req.user?._id
    })

    await Likes.deleteOne({
        video: videoId,
        likedBy: req.user?._id
    })

    return res.status(200).json(new ApiResponse("Video Disliked successfully", null, 200))
})

const toggleDislikeComments = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid comment id", 400)
    }

    const isAlreadyDisliked = await Dislikes.findOne({
        comment: commentId,
        dislikedBy: req.user?._id
    })

    if (isAlreadyDisliked) {
        await Dislikes.deleteOne({
            comment: commentId,
            dislikedBy: req.user?._id
        })

        return res.status(200).json(new ApiResponse("Comment Disliked removed successfully", null, 200))
    }

    await Dislikes.create({
        comment: commentId,
        dislikedBy: req.user?._id
    })

    await Likes.deleteOne({
        comment: commentId,
        likedBy: req.user?._id
    })


    return res.status(200).json(new ApiResponse("Comment Disliked successfully", null, 200))
})

const toggleDislikeTweets = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError("Invalid tweet id", 400)
    }

    const isAlreadyDisliked = await Dislikes.findOne({
        tweet: tweetId,
        dislikedBy: req.user?._id
    })

    if (isAlreadyDisliked) {
        await Dislikes.deleteOne({
            tweet: tweetId,
            dislikedBy: req.user?._id
        })

        return res.status(200).json(new ApiResponse("Tweet Disliked removed successfully", null, 200))
    }

    await Dislikes.create({
        tweet: tweetId,
        dislikedBy: req.user?._id
    })

    await Likes.deleteOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })


    return res.status(200).json(new ApiResponse("Tweet Disliked successfully", null, 200))
})

export {
    toggleDislikeVideo,
    toggleDislikeTweets,
    toggleDislikeComments
}