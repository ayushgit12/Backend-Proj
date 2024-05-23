import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getUserHistory } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.route('/register').post(
     upload.fields([     // MIDDLEWARE
          { name: 'avatar', maxCount: 1 },
          { name: 'coverImage', maxCount: 1 }
     
     ]),
     
     registerUser
)

router.route('/login').post(
     // login
     loginUser
)

router.route('/refresh-token').post(refreshAccessToken)

// secured Routes
                         // MIDDLEWARE
                         //    |
                         //    V
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/change-passsowrd').post(verifyJWT, changeCurrentPassword)
router.route('/current-user').get(verifyJWT, getCurrentUser)
router.route('/update-account').patch(verifyJWT, updateAccountDetails)
router.route('/update-avatar').patch(verifyJWT,upload.single("avatar"), updateUserAvatar)
router.route('/update-cover-Image').patch(verifyJWT,upload.single("coverImage"), updateUserCoverImage)
router.route('/channel/:params').get(verifyJWT, getUserChannelProfile)
router.route('/watch-history').get(verifyJWT, getUserHistory)

export default router;