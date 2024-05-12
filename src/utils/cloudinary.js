import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import { ApiError } from "./ApiError.js";
import { ApiResponse } from "./ApiResponse.js";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        console.log("File Uploaded Successfully", response.url)
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)

        throw new ApiError("Error while Uploading Cloudinary File", 500)
    }
}

const deleteFile = async (publicId, type = "image") => {
    try {
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: type
        })
        console.log("File Deleted Successfully", response)
    } catch (error) {
        throw new ApiError("Error while Deleting Cloudinary File", 500)
    }
}
export { uploadOnCloudinary, deleteFile }