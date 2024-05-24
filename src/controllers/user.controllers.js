
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { APIresponse } from '../utils/APIresponse.js'
import jwt from 'jsonwebtoken'
import { subscribe } from 'diagnostics_channel'
import mongoose from 'mongoose'

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'OK' })

  const { username, fullName, email, password } = await req.body
  // console.log(username, fullName, email, password)

  if (
    [fullName, email, password].some((field) => field?.trim() === '')
  ) {
    throw new ApiError(400, 'Full name is required')
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, 'User with email or username already exists')
    // console.log('User with email or username already exists')
  }

  const avatarLocalPath = req.files?.avatar[0]?.path
  // const coverImageLocalPath = req.files?.coverImage[0]?.path
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required')
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar)
    throw new ApiError(500, 'Avatar Image required')

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url ? coverImage.url : "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user')
  }
  return res.status(201).json(
    new APIresponse(201, createdUser, 'User registered successfully')
  )
})



const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    // console.log(accessToken, refreshToken)
    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, 'Something went wrong while generating tokens')
  }
}


const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // compare email and password
  // generate token

  const { email, username, password } = req.body

  if (!email && !username) {
    throw new ApiError(400, 'Email or username is required')
  }

  const user = await User.findOne(
    { $or: [{ email }, { username }] }
  )

  if (!user)
    throw new ApiError(404, 'User not found')

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid)
    throw new ApiError(401, 'Invalid user credentials')

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(
      new APIresponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken

      },
        'User logged in successfully')
    )


})


const logoutUser = asyncHandler(async (req, res) => {
  // clear cookies
  // remove refresh token from database
  await User.findByIdAndUpdate(req.user._id,
    {
      $unset: {
        refreshToken: 1
      }
    },
    { new: true }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new APIresponse(200, {}, 'User logged out successfully'))


})


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken)
    throw new ApiError(401, 'Unauthorized Request')

  try {
    const decodedToken = jwt.verify(incomingRefreshToken
      , process.env.REFRESH_TOKEN_SECRET)


    const user = await User.findById(decodedToken?._id)

    if (!user)
      throw new ApiError(404, 'Invalid Refresh Token')

    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, 'Refresh Token is Expired')

    const options = {
      httpOnly: true,
      secure: true
    }

    const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

    return res.status(200)
      .cookie('accessToken', newAccessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new APIresponse(200, { newAccessToken, newRefreshToken }
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || 'Unauthorized Request')
  }



})


const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect)
    throw new ApiError(401, 'Invalid old password')

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(
      new APIresponse(200, {}, 'Password changed successfully')
    )
})


const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new APIresponse(200, req.user, 'Current User fetched successfully')
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  if (!fullName || !email)
    throw new ApiError(400, 'All fields are required')

  const user = await User.findByIdAndUpdate(req.user?._id,
    { $set: { fullName, email } },
    { new: true }).select("-password")

  return res
    .status(200)
    .json(
      new APIresponse(200, user, 'Account details updated successfully')
    )

})



const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = await req.file?.path

  if (!avatarLocalPath)
    throw new ApiError(400, 'Avatar file is required')

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url)
    throw new ApiError(400, 'Error while uploading avatar')

  // await User.findByIdAndDelete(req.user?._id , {avatar: 1})



  const user = await User.findByIdAndUpdate(req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password")



  return res
    .status(200)
    .json(
      new APIresponse(200, user, 'Avatar updated successfully')
    )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = await req.file?.path

  if (!coverImageLocalPath)
    throw new ApiError(400, 'Cover Image file is required')

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url)
    throw new ApiError(400, 'Error while uploading cover Image')


  const user = await User.findByIdAndUpdate(req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(
      new APIresponse(200, user, 'Cover Image updated successfully')
    )
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
  const {username} = req.params
  // console.log(username)

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new APIresponse(200, channel[0], "User channel fetched successfully")
    )
})


const getUserHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
      {
        $match:{
          _id: new mongoose.Types.ObjectId(req.user._id)

        }
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
                ]
              }

          },
          {
            $addFields:{
              owner: {
                $first: "$owner"
              }
            }
            
          }
          ]
        }
      }
    ])


    return res.status(200)
    .json(
      new APIresponse(200, user[0].watchHistory, 'Watch history fetched successfully')
    )
    
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserHistory
}

