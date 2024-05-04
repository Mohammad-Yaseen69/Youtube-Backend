import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

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
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}