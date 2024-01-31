import jwt from "jsonwebtoken";
import createAsyncError from "./createAsyncError.js";
import tbl_user from "../model/tbl_user.js";

const isAuthenticatedUser = createAsyncError(async (req, res, next) => {
  // const token = req.cookies.uuid;
  try {
    const token =
      req.header("Authorization")?.split(" ")[1] ||
      req.header("authorization")?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "token not found" });
    }

    const decoded = jwt.verify(token, process.env.Token_Pass);

    if (!decoded) {
      res.status(401)({ message: "not decode" });
    }
    req.userInfo = await tbl_user.findById(decoded.userid);

    if (!req.userInfo) {
      res.status(401).json({ message: "user not valid" });
    }
    if (req.userInfo.status !== 1) {
      res.status(401)({ message: "user not valid for this web" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "user not authorize" });
  }
});

export { isAuthenticatedUser };
