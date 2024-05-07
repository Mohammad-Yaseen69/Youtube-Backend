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
    updateCoverImg
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
router.route("/update-details").post(verifyJWT, updateUserDetails)
router.route("/updateAvatar").post(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/updateCoverImg").post(verifyJWT, upload.single("coverImg"), updateCoverImg)


export default router;