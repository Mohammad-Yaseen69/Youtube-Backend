import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comments.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id")

    if (!content) throw new ApiError(400, "Content is required")

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

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment id")

    if (!content) throw new ApiError(400, "Content is required")

    const updatedComment = await Comment.findByIdAndUpdate(commentId, { content }, { new: true })

    if (!updatedComment) throw new ApiError(500, "Error while updating comment")

    return res.status(200)
        .json(new ApiResponse("Comment updated successfully", updatedComment, 200))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment id")


    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(new ApiResponse("Comment deleted successfully", null, 200))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}