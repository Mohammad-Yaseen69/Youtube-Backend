import {
    toggleDislikeComments,
    toggleDislikeTweets,
    toggleDislikeVideo
} from "../controllers/dislike.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { Router } from "express"

const router = Router()

router.use(verifyJWT)

router.patch("/toggle/v/:videoId", toggleDislikeVideo)
router.patch("/toggle/c/:commentId", toggleDislikeComments)
router.patch("/toggle/t/:tweetId", toggleDislikeTweets)

export default router