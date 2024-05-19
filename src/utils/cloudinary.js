
import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


cloudinary.config({ 
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
     api_key: process.env.CLOUDINARY_API_KEY, 
     api_secret: process.env.CLOUDINARY_API_SECRET 
   }); 



const uploadOnCloudinary = async(localFilePath)=>{
     try {
          if(!localFilePath)
               return new Error("local File not exists")
          const response = await cloudinary.uploader.upload(localFilePath,{
               resource_type: "auto"
          })
          // console.log("File Uploaded Successfully", response.url)
          fs.unlinkSync(localFilePath)
          return response
          
          
     } catch (error) {
          // If file didn't get uploaded, we have to remove it from our server, as it might contain malicious info and data!
          fs.unlinkSync(localFilePath)
          return new Error(error)
          
     }
}

export {uploadOnCloudinary}

