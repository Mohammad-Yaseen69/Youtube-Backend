import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {
            accessToken,
            refreshToken
        }
    } catch (error) {
        throw new ApiError("Something went wrong while generating Tokens", 500)
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    // Steps:
    // Get user details from frontend
    // check if the fields are not empty
    // check if user already exists
    // check and upload avatar and coverImg on cloudinary
    // check if img uploaded successfully
    // create user object and entry in db
    // remove password and refresh token in response
    // check for user creation
    // send response to user

    const { fullName, email, password, userName } = req.body

    if (!fullName || !email || !password || !userName) {
        throw new ApiError("All fields are required", 400)
    }

    if (password.length < 6) {
        throw new ApiError("Password must be at least 6 characters", 400)
    }

    if (!email.includes("@")) {
        throw new ApiError("Email must contains @", 400)
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existedUser) {
        throw new ApiError("User with this username or email already exist", 408)
    }

    const avatarLocalPath = req?.files?.avatar?.[0]?.path
    const coverImgLocalPath = req?.files?.coverImg?.[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400)
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImg = avatarLocalPath ? await uploadOnCloudinary(coverImgLocalPath) : undefined

    if (!avatar) {
        throw new ApiError("Error uploading image", 500)
    }

    const user = await User.create({
        fullName,
        email,
        userName,
        password,
        avatar: avatar?.url,
        coverImg: coverImg?.url || ""
    })


    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError("Error creating user", 500)
    }



    return res.status(201).json(
        new ApiResponse("User created successfully", createdUser, 200)
    )
})


const loginUser = asyncHandler(async (req, res, next) => {
    // Steps:
    //1) Get user details from postman
    //2) check if this email or userName exist or not
    //3) assign refresh token
    //4) verify password
    //5) return boolean value based on if user logged in or not

    const { email, userName, password } = req.body

    if (!(email || userName)) {
        throw new ApiError("userName or email is required", 400)
    }

    let query = {};

    if (email) {
        query.email = email;
    }
    else {
        query.userName = userName
    }

    const user = await User.findOne(query)

    if (!user) {
        throw new ApiError("User Not Found", 404)
    }

    const isPasswordCorrect = await user.checkPassword(password)

    if (!isPasswordCorrect) {
        throw new ApiError("Invalid Credentials", 401)
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.
        status(200).
        cookie("refreshToken", refreshToken, options).
        cookie("accessToken", accessToken, options).
        json(
            new ApiResponse("User logged in successfully", {
                user: loggedInUser,
                accessToken,
                refreshToken,
            }, 200)
        )

})

const logoutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset: { refreshToken: "" },
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.
        status(200).
        clearCookie("refreshToken", options).
        clearCookie("accessToken", options).
        json(
            new ApiResponse("User logged out successfully", null, 200)
        )

})
const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError("Refresh Token is required", 400)
    }

    const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError("Invalid Refresh Token", 404)
    }


    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError("Invalid Refresh Token", 401)
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    await User.findByIdAndUpdate(user._id, {
        $set: { refreshToken }
    }, { new: true })

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.
        status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).
        json(
            new ApiResponse("Access Token refreshed successfully", {
                accessToken,
                refreshToken
            }, 200)
        )
})

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.checkPassword(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError("Invalid Password", 400)
    }
    if (!(newPassword === confirmPassword)) {
        throw new ApiError("Passwords do not match", 400)
    }

    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse("Password changed successfully", null, 200)
    )
})

const getCurrentUser = asyncHandler(async (req, res, next) => {
    return res.status(200).json(
        new ApiResponse("User Fetched Successfully", req.user, 200)
    )
})


const updateUserDetails = asyncHandler(async (req, res, next) => {
    const { fullName, userName } = req.body

    if (!fullName && !userName) {
        throw new ApiError("fullName or userName is required", 400)
    }

    const updateFields = {}
    if (fullName) {
        updateFields.fullName = fullName
    }
    if (userName) {
        updateFields.userName = userName
    }

    const updatedInfo = await User.findByIdAndUpdate(req.user._id, {
        $set: updateFields
    }, { new: true }).select("-password")

    if (!updatedInfo) {
        throw new ApiError("Error updating user", 500)
    }

    res.status(200).json(
        new ApiResponse("User updated successfully", updatedInfo, 200)
    )
})


const updateAvatar = asyncHandler(async (req, res, next) => {
    const avatarLocalPath = req?.file?.path

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400)
    }

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError("User not found", 404)
    }

    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : null

    if (!avatar) {
        throw new ApiError("Error uploading image", 500)
    }

    const avatarPublicId = user?.avatar?.split('/').pop().split('.')[0]
    const deleteAvatar = await avatarPublicId ? deleteFile(avatarPublicId) : null

    if (!deleteAvatar) {
        throw new ApiError("Error deleting image", 500)
    }

    user.avatar = avatar?.url

    user.save({ validateBeforeSave: false })
    return res.status(200).json(
        new ApiResponse("Image updated successfully", null, 200)
    )
})

const updateCoverImg = asyncHandler(async (req, res, next) => {
    const coverImgLocalPath = req?.file?.path

    if (!coverImgLocalPath) {
        throw new ApiError("Cover Image is required", 400)
    }

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError("User not found", 404)
    }
    const coverImg = coverImgLocalPath ? await uploadOnCloudinary(coverImgLocalPath) : null

    if (!coverImg) {
        throw new ApiError("Error uploading image", 500)
    }

    const coverImgPublicId = user?.coverImg?.split('/').pop().split('.')[0]
    const deleteCoverImg = await coverImgPublicId ? deleteFile(coverImgPublicId) : null

    if (!deleteCoverImg) {
        throw new ApiError("Error deleting image", 500)
    }

    user.coverImg = coverImg?.url

    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse("Image updated successfully", null, 200)
    )
})


const getUserProfileDetails = asyncHandler(async (req, res, next) => {
    const { userName } = req.params

    if (!userName?.trim()) {
        throw new ApiError("UserName is required", 400)
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTO"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                subscribedTOCount: { $size: "$subscribedTO" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
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
                coverImg: 1,
                subscribersCount: 1,
                subscribedTOCount: 1,
                isSubscribed: 1,
                email: 1,
                createdAt: 1
            }
        },
    ])

    if (!channel.length) {
        throw new ApiError("Channel not found", 404)
    }

    return res
        .status(200)
        .json(new ApiResponse("Data fetched Successfully", channel[0], 200))
})


const getWatchHistory = asyncHandler(async (req, res, next) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        userName: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!user) {
        throw new ApiError("User not found", 404)
    }

    return res.
        status(200).
        json(new ApiResponse("Data fetched Successfully", user[0]?.watchHistory, 200))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverImg,
    getUserProfileDetails,
    getWatchHistory
}