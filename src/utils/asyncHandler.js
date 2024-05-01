const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        console.log(error.message)
        res.status(error.code || 500).json({
            message: error.message,
            success: false
        })
    }
}

export { asyncHandler } 