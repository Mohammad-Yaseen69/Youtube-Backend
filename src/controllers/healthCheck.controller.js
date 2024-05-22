import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";


const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse("Server is up and running", null, 200))
})

export { healthCheck }