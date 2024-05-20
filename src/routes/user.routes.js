import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken } from "../controllers/user.controllers.js";
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

export default router;