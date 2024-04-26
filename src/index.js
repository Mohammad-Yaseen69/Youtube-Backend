import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js";

dotenv.config({
    path: './env'
})


connectDB()
    .then(() => {
        app.on("error", (err) => {
            console.log("Error in server", err);
        })
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    })

    .catch((err) => {
        console.log("Mongo DB Connection Failed", err);
    })