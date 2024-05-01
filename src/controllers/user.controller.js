import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

    if (!email.includes("@") && !email.includes(".com")) {
        throw new Error("Email must contains @", 400)
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existedUser) {
        throw new ApiError("User with this username or email already exist", 408)
    }

    const avatarLocalPath = res?.files?.avatar?.[0]?.path
    const coverImgLocalPath = res?.files?.coverImg?.[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400)
    }

    const avatar = uploadOnCloudinary(avatarLocalPath)
    const coverImg = uploadOnCloudinary(coverImgLocalPath)

    if (!avatar) {
        throw new ApiError("Error uploading image", 500)
    }

    const user = await User.create({
        fullName,
        email,
        userName,
        avatar: avatar?.url,
        coverImg: coverImg?.url
    })


    const createdUser = User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError("Error creating user", 500)
    }

    console.log("email : ", email, req.body)

    return res.status(201).json(
        new ApiResponse("User created successfully", createdUser , 200)
    )
})

export { registerUser }