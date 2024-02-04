import createAsyncError from "../middleware/createAsyncError.js";
import tbl_user from "../model/tbl_user.js";
import tbl_post from "../model/tbl_post.js";
import { PutObject, GetObject, DeleteObject } from "../util/aws.js";
const passwordRegex =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// create or register user
const createUser = createAsyncError(async (req, res) => {
  const { email, name, password } = req.body;

  if (!email) {
    return res.status(401).json({ message: "please fill the form properly" });
  }
  try {
    const existemail = await tbl_user.find({ email: email });

    if (existemail.length > 0) {
      return res.status(401).json({ message: "email already register" });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Your password must include at least one symbol and be 8 or more characters long",
      });
    }

    const createuser = await tbl_user.create({
      email,
      name,
      password,
    });

    res.status(201).json({ message: "register successfully", status: 1 });
  } catch (err) {
    res.status(500).json({ message: "something went wrong" });
  }
});

const loginUser = createAsyncError(async (req, res) => {
  const { email, password } = req.body;

  if (!password) {
    return res.status(401).json({ message: "please fill the form properly" });
  }
  try {
    const existuser = await tbl_user.findOne({ email: email });

    if (!existuser) {
      return res.status(401).json({ message: "wrong email or password" });
    }

    const isPasswordMatched = await existuser.matchPassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({ message: "wrong email or password" });
    }

    const userid = existuser._id;

    const token = jwt.sign({ userid }, process.env.Token_Pass, {
      expiresIn: "30d",
    });

    res
      .status(201)
      .json({ token: token, message: "login successfully", status: 1 });
  } catch (err) {
    res.status(500).json({ message: "something went wrong", err: err.message });
  }
});

const uploadPost = createAsyncError(async (req, res) => {
  try {
    const imgDetails = req.files["image"][0];

    const randomimgDetails = crypto.randomBytes(32).toString("hex");
    const exe = await imgDetails.mimetype.split("/")[1];
    const originalname = await imgDetails.originalname;
    const Keys = `enter you folder name/${randomimgDetails}.${exe}`;
    const Bodys = imgDetails.buffer;
    const ContentTypes = await imgDetails.mimetype;

    await PutObject(Keys, Bodys, ContentTypes);

    const createdimgDetails = await tbl_post.create({
      originalName: originalname,
      postedBy: req.userInfo._id,
      customName: Keys,
    });
    res.status(201).json({ message: "image upload successfully" });
  } catch (err) {
    res.status(500).json({ message: "something went wrong", err: err.message });
  }
});

const getPost = createAsyncError(async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) {
      return res.status(401).json({ message: "post id not get" });
    }

    const createdimgDetails = await tbl_post.findById({
      _id: postId,
    });

    const preSignUrl = await GetObject(createdimgDetails.customName);
    res.status(200).json({ preSignUrl });
  } catch (err) {
    res.status(500).json({ message: "something went wrong", err: err.message });
  }
});

const deletePost = createAsyncError(async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) {
      return res.status(401).json({ message: "post id not get" });
    }

    const createdimgDetails = await tbl_post.findById({
      _id: postId,
    });

    const preSignUrl = await DeleteObject(createdimgDetails.customName);
    const deletes = await tbl_post.findByIdAndDelete({
      _id: postId,
    });
    res.status(201).json({ message: "image delete successfully" });
  } catch (err) {
    res.status(500).json({ message: "something went wrong", err: err.message });
  }
});

export { createUser, loginUser, uploadPost, getPost, deletePost };
