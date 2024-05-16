import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name) {
        throw new ApiError("Name is required", 400)
    }
    let obj = {
        name,
        owner: req.user._id
    }

    if (description) {
        obj.description = description
    }

    const playlist = await Playlist.create(obj)

    if (!playlist) {
        throw new ApiError("Playlist not created", 500)
    }

    return res.status(201).
        json(new ApiResponse("Playlist created successfully", playlist, 200))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError("Invalid user id", 400)
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
                name: 1,
                description: 1
            }
        }
    ])


    return res.status(200).
        json(new ApiResponse("Playlists fetched successfully", playlists, 200))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlist id", 400)
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            owner: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            createdAt: 1,
                            views: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
                name: 1,
                videos: 1,
                description: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse("Playlist fetched successfully", playlist, 200))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlist id", 400)
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video id", 400)
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }

    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError("You are not the owner of this playlist", 401)
    }

    const videoAdded = await Playlist.findByIdAndUpdate(playlistId, {
        $addToSet: { videos: videoId }
    }, { new: true })

    return res.status(200)
        .json(new ApiResponse("Video added to playlist successfully", videoAdded, 200))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlist id", 400)
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError("Invalid video id", 400)
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }

    if (!video) {
        throw new ApiError("Video not found", 404)
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError("You are not the owner of this playlist", 401)
    }

    const removeVideo = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: { videos: videoId }
    }, { new: true })

    return res.status(200)
        .json(new ApiResponse("Video removed from playlist successfully", removeVideo, 200))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError("Invalid playlist id", 400)
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }

    if (playlist?.owner.toString() != req.user._id.toString()) {
        throw new ApiError("You are not the owner of this Playlist", 401)
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200)
        .json(new ApiResponse("Playlist deleted successfully", null, 200))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    let obj = {}

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError("Playlist not found", 404)
    }

    if (req.user._id.toString() != playlist.owner.toString()) {
        throw new ApiError("You are not the owner of this Playlist", 401)
    }

    if (name) {
        obj.name = name
    }

    if (description) {
        obj.description = description
    }

    console.log(obj)
    if (!name && !description) {
        throw new ApiError("Please provide name or description to update", 400)
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, { 
        $set: obj
     }, { new: true })

    if (!updatedPlaylist) {
        throw new ApiError("Error while updating playlist", 500)
    }

    return res.status(200)
        .json(new ApiResponse("Playlist updated successfully", updatedPlaylist, 200))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}