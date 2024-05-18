
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { create } from 'domain'
import { APIresponse } from '../utils/APIresponse.js'

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'OK' })

  const {username, fullName, email, password} = await req.body
  console.log(username, fullName, email, password)

  if(
    [fullName, email, password].some((field) => field?.trim()==='')
  ){
    throw new ApiError(400, 'Full name is required')
  }
  const existedUser = User.findOne({
    $or: [{username}, {email}]
  })

  if(existedUser){
    throw new ApiError(409, 'User with email or username already exists')
  }

  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if(!avatarLocalPath){
    throw new ApiError(400, 'Avatar file is required')
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar)
    throw new ApiError(500, 'Avatar Image required')

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url?coverImage.url:"",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, 'Something went wrong while registering the user')
  }
  return res.status(201).json(
    new APIresponse(201, createdUser, 'User registered successfully')
  )
})

export { registerUser }