import { User } from "../models/user.models";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";


export const verifyJWT = asyncHandler(async (req, res, next) => {

     // In the req.header , we have the Authorization header which contains the token. But it is in the form of Bearer <token>. So we need to remove the Bearer part and get the token only.

     try {
          const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

          if (!token) {
               throw new ApiError(401, "Unauthorized Request")
          }

          const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

          const user = await User.findById(decodedToken?._id.select("-password -refreshToken"))

          if (!user)
               throw new ApiError(404, "User not found")

          req.user = user
          next()
     } catch (error) {
          throw new ApiError(401, (error?.message || "Invalid Access Token"))
     }



})

