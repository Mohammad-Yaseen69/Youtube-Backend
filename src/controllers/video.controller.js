import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
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
        thumbnailId: thumbnail?.public_id,
        owner: req?.user?._id,
        duration: video?.duration
    })

    if (!videoDoc) {
        throw new ApiError("Error creating video", 500)
    }

    return res.status(200)
        .json(new ApiResponse("Video uploaded successfully", videoDoc, 200))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}