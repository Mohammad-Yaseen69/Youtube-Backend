import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/ApiError.js";

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    avatar: {
        type: String, //Cloudinary Url
        required: true
    },
    coverImg: {
        type: String, //Cloudinary Url
    },

    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],

    refreshToken: {
        type: String
    }
}, { timestamps: true })


userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10)
})


userSchema.methods.checkPassword = async function (password) {
    try {
        const result = await bcrypt.compare(password, this.password);
        return result;
    } catch (error) {
        throw new ApiError("bcrypt Error" ,error.message);
    }
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userName: this.userName,
            email: this.email,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)