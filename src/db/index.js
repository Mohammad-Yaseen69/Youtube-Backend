import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB = async () => {
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_Name}`);

       console.log("DB Connected !! DB Host : ",connectionInstance.connection.host)
    } catch (error) {
        console.log("Error :" + error)
        process.exit(1)
    }
}


export default connectDB