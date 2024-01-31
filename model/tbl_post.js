import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    originalName: {
      type: String,
    },
    customName: {
      type: String,
    },
    PostedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tbl_user",
    },

    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const tbl_post = mongoose.model("tbl_post", userSchema);

export default tbl_post;
