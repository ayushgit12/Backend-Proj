import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



const connectDB = async () => {
     try {
          const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
          console.log(`\nMONGO DB connection made. DB_HOST: ${connectionInstance.connection.host} \n`);
     } catch (error) {
          console.error(error);

          throw error;
          process.exit(1);
     }
}

export default connectDB;