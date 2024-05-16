import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comments.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Likes } from "../models/likes.model.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const video = await Video.findById(videoId)

    if (!video) throw new ApiError("Video not found", 404)

    const aggregations = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "comment",
                as: "dislikes"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
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
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: 1,
                likes: 1,
                isLiked: 1,
                dislikes: 1,
                isDisliked: 1,
            }
        }
    ])


    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate(aggregations, options)

    return res.status(200)
        .json(new ApiResponse("Comments fetched successfully", comments, 200))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!isValidObjectId(videoId)) throw new ApiError("Invalid video id", 400)

    if (!content) throw new ApiError("Content is required", 400)

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if (!comment) throw new ApiError(500, "Error while adding comment")

    return res.status(200)
        .json(new ApiResponse("Comment added successfully", comment, 200))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid comment id", 400)
    }

    if (!content) {
        throw new ApiError("Content is required", 400)
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError("Comment not found", 404)
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError("Unauthorized", 401)
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, { new: true })

    if (!updatedComment) {
        throw new ApiError("Error while updating comment", 500)
    }

    return res.status(200)
        .json(new ApiResponse("Comment updated successfully", updatedComment, 200))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if (!isValidObjectId(commentId)) {
        throw new ApiError("Invalid comment id", 400)
    }

    if (!comment) {
        throw new ApiError("Comment not found", 404)
    }

    if (comment?.owner.toString() != req.user?._id.toString()) {
        throw new ApiError("Unauthorized", 401)
    }

    await Likes.deleteMany({
        comment: commentId,
    })

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(new ApiResponse("Comment deleted successfully", null, 200))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}