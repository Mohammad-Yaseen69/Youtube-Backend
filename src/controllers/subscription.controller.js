import mongoose, { isValidObjectId, mongo } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    if (!isValidObjectId(channelId)) {
        throw new ApiError('Invalid channel id', 400)
    }

    const isSubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    })

    if (isSubscribed) {
        await Subscription.deleteOne({
            _id: isSubscribed._id
        })

        return res.status(200)
            .json(new ApiResponse("Unsubscribed Successfully", null, 200))
    }
    else {
        await Subscription.create({
            channel: channelId,
            subscriber: req.user?._id
        })

        return res.status(200)
            .json(new ApiResponse("Subscribed Successfully", null, 200))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError('Invalid channel id', 400)
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "isSubscribed"
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$isSubscribed" },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [channelId, "$isSubscribed.subscriber"] }, // Corrected typo from "$isSubscribed.subscriber" to "$subscriber.subscriber"
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            userName: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribers"
        },
        {
            $project: {
                subscribers: 1
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse("Subscribers", subscribers, 200))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, 'Invalid subscriber id')
    }
    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channels",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            userName: 1,
                            avatar: 1,
                            videosByChannels: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channels"
        },
        {
            $project: {
                channels: 1
            }
        }
    ])

    if (!channels) {
        throw new ApiError('No channels found', 400)
    }

    return res.status(200)
        .json(new ApiResponse("Channels", channels, 200))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}