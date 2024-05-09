import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatar,
    updateUserDetails,
    updateCoverImg,
    getUserProfileDetails,
    getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImg",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// Secure Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/get-current-user").get(verifyJWT, getCurrentUser)
router.route("/update-details").patch(verifyJWT, updateUserDetails)
router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/updateCoverImg").patch(verifyJWT, upload.single("coverImg"), updateCoverImg)
router.route("/c/:userName").get(verifyJWT, getUserProfileDetails)
router.route("/history").get(verifyJWT, getWatchHistory)


export default router;