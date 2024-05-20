
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { APIresponse } from '../utils/APIresponse.js'
import jwt from 'jsonwebtoken'

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
    console.log(accessToken, refreshToken)
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

export { registerUser, loginUser, logoutUser, refreshAccessToken }