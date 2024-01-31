import express from "express";
import { isAuthenticatedUser } from "../middleware/auth.js";
import {
  loginUser,
  createUser,
  uploadPost,
} from "../controller/ct_userpost.js";
import multer, { memoryStorage } from "multer";
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });
const router = express.Router();

router.route("/register").post(createUser);
router.route("/login").post(loginUser);

router
  .route("/uploadpost")
  .post(
    isAuthenticatedUser,
    upload.fields([{ name: "image", maxCount: 1 }]),
    uploadPost
  );

export default router;
