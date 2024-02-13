import tbl_user_chat_details from "../../Model/tbl_user_chat_details.js";
import tbl_user_notification from "../../Model/tbl_user_notification.js";
import tbl_user from "../../Model/tbl_userinfo.js";
import tbl_user_follow from "../../Model/tbl_user_follow.js";
import tbl_user_chat_message from "../../Model/tbl_user_chat_message.js";
import tbl_post from "../../Model/tbl_post.js";
import tbl_post_bestclip from "../../Model/tbl_post_bestclip.js";
import tbl_post_meme from "../../Model/tbl_post_meme.js";
import tbl_post_reel from "../../Model/tbl_post_reel.js";
import tbl_post_tumbnail from "../../Model/tbl_post_tumbnail.js";
import tbl_post_image from "../../Model/tbl_post_image.js";
import tbl_post_meme_imgvideo from "../../Model/tbl_post_meme_imgvideo.js";
import tbl_post_meme_imgvideo_tumbnail from "../../Model/tbl_post_meme_imgvideo_tumbnail.js";
import tbl_post_bestclip_tumbnail_img from "../../Model/tbl_post_bestclip_tumbnail_img.js";
import tbl_reel_comment from "../../Model/tbl_reel_comment.js";
import tbl_post_meme_comment from "../../Model/tbl_post_meme_comment.js";
import tbl_post_bestclip_imgvideo from "../../Model/tbl_post_bestclip_imgvideo.js";
import tbl_reel_tumbnail_img from "../../Model/tbl_reel_tumbnail_img.js";
import tbl_post_child_comment from "../../Model/tbl_post_child_comment.js";
import tbl_bestclip_child_comment from "../../Model/tbl_bestclip_child_comment.js";
import tbl_post_meme_child_comment from "../../Model/tbl_post_meme_child_comment.js";
import tbl_post_reel_child_comment from "../../Model/tbl_post_reel_child_comment.js";
import tbl_post_bestclip_comment from "../../Model/tbl_post_bestclip_comment.js";
import tbl_post_comment from "../../Model/tbl_post_comment.js";
import tbl_user_notification_connection from "../../Model/tbl_user_notification_connection.js";
import tbl_user_chat_group_profile from "../../Model/tbl_user_chat_group_profile.js";
import createAsyncError from "../../Middleware/createAsyncError.js";
import { getProfileImage } from "../../utils/profile_image.js";
import crypto from "crypto";
import { postDetails } from "./ct_post.js";
import {
  PutObject,
  GetObject,
  DeleteObject,
  uploadVideoInChunks,
  initiateObjectStream,
  getObjectFileSize,
} from "../../utils/aws_images.js";

const key = crypto.randomBytes(32).toString("hex");

// Encrypt function
function encrypt(text, key) {
  const cipher = crypto.createCipher("aes-256-cbc", key);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

// Decrypt function
function decrypt(encryptedText, key) {
  const decipher = crypto.createDecipher("aes-256-cbc", key);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const createEMChatConnection = createAsyncError(async (req, res) => {
  try {
    const { isGroupChat, userId, groupName, description } = req.body;
    const x = await req.userInfo._id.toString();

    let userIds = await userId;

    if (JSON.parse(isGroupChat) == true) {
      userIds.push(x);

      const img = req.files.image[0];

      const randomName = crypto.randomBytes(32).toString("hex");
      const exe = await img.mimetype.split("/")[1];
      const xx = await img.originalname;
      const Keys = `postGroupProfileImg/${randomName}.${exe}`;
      const Bodys = img.buffer;
      const ContentTypes = await img.mimetype;

      await PutObject(Keys, Bodys, ContentTypes);

      const createdGroupImg = await tbl_user_chat_group_profile.create({
        originalName: xx,
        postedBy: req.userInfo._id,
        customName: Keys,
      });

      const uniqueArray = [...new Set(userIds)];
      console.log(uniqueArray);
      const createchat = await tbl_user_chat_details.create({
        users: uniqueArray,
        isGroupChat: true,
        groupName: groupName,
        groupAdmin: req.userInfo._id,
        groupProfileImgId: createdGroupImg._id,
        groupSuperAdmin: req.userInfo._id,
        description: description,
      });

      return res.status(201).json({
        chatId: createchat._id,
        isGroupChat: createchat,
        x: "shubham",
      });
      // return res.json({message : "shubham",isGroupChat})
    } else {
      const isChat2 = await tbl_user_chat_details.find({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: userIds } } },
          { users: { $elemMatch: { $eq: req.userInfo._id } } },
        ],
      });

      if (isChat2.length >= 1) {
        return res.status(200).json({
          chatId: isChat2[0]._id,
          isGroupChat: isChat2[0].isGroupChat,
        });
      }

      const checkchatid = await tbl_user_chat_details.create({
        users: [userIds, x],
      });
      return res.status(201).json({
        chatId: checkchatid._id,
        isGroupChat: checkchatid.isGroupChat,
        x: "thailesh",
      });

      // return res.json({message : "thailesh", isGroupChat})
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong !", err: err.message });
    console.log(err);
  }
});

const createEMMessage = createAsyncError(async (req, res) => {
  const { chatId, message, replyMessageId } = req.body;
  try {
    const getalllist = await tbl_user_chat_details.findById({ _id: chatId });

    const check = getalllist.users.filter(
      (e) => e != req.userInfo._id.toString()
    );
    const encryptedMessage = encrypt(message, key);
    const x = await tbl_user_chat_message.create({
      message: encryptedMessage,
      chatId: chatId,
      senderUserId: req.userInfo._id,
      receiverUserId: check,
    });

    let findReply;
    if (replyMessageId) {
      findReply = await tbl_user_chat_message.findById({
        _id: replyMessageId,
      });
    }

    res.status(201).json({
      message: message,
      messageId: x._id,
      replyMessageId: findReply && replyMessageId,
      replyMessage: findReply && findReply.message,
      senderUserId: x.senderUserId,
      chatId: x.chatId,
      receiverUserId: x.receiverUserId,
      side: req.userInfo._id == x.senderUserId.toString() ? "left" : "right",
      createdTime: x.createdAt,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong !", err: err.message });
    console.log(err);
  }
});

const listEMChat = createAsyncError(async (req, res) => {
  try {
    const find = await tbl_user_chat_details
      .find({ users: { $elemMatch: { $eq: req.userInfo._id } } })
      .sort({ updatedAt: -1 });
    // res.json(find)
    const ccc = await Promise.all(
      find.map(async (x, index) => {
        const resp = {
          chatId: x._id,
          isGroupChat: x.isGroupChat,
          createdTime: x.createdAt,
        };

        if (x.isGroupChat == true) {
          resp.groupName = x.groupName;
          resp.description = x.description;

          if (x.groupProfileImgId) {
            const findGroupImg = await tbl_user_chat_group_profile.findById({
              _id: x.groupProfileImgId,
            });
            resp.groupProfileImg = await GetObject(findGroupImg.customName);
          }

          if (x.groupSuperAdmin) {
            const superadmin = await tbl_user.findById({
              _id: x.groupSuperAdmin,
            });
            resp.superAdminName = await superadmin.fname;
            resp.superAdminUsername = await superadmin.username;
            resp.superAdminId = await superadmin._id;
          }
        } else if (x.isGroupChat == false) {
          const baby = x.users.filter((e) => e != req.userInfo._id.toString());
          const babu = await Promise.all(
            baby.map(async (xx, indexx) => {
              const xxx = await tbl_user.findById({ _id: xx });
              resp.userId = xxx._id;
              resp.fname = xxx.fname;
              resp.username = xxx.username;
              if (xxx.imageId) {
                resp.profileImg = await getProfileImage(xxx.imageId);
              }
            })
          );
        }
        return resp;
      })
    );
    res.status(200).json({ chatList: ccc });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const chatUserList = createAsyncError(async (req, res) => {
  const { chatId } = req.body;
  try {
    const findChat = await tbl_user_chat_details.findById({ _id: chatId });
    if (!findChat) {
      return res.status(401).json({ message: "chat id not found" });
    }
    const presignedUrls = await Promise.all(
      findChat.users.map(async (x) => {
        const userdetails = await tbl_user.findById({ _id: x });
        const resp = {
          userId: userdetails._id,
          username: userdetails.username,
          fname: userdetails.fname,
        };

        if (userdetails.imageId) {
          resp.profileImg = await getProfileImage(userdetails.imageId);
        }

        const checkuseringroup = findChat.groupAdmin.includes(x);

        resp.check = checkuseringroup;

        return resp;
      })
    );
    res.status(200).json({ message: presignedUrls });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const checkUserAdmin = createAsyncError(async (req, res) => {
  const { chatId, userId } = req.body;
  try {
    const findChat = await tbl_user_chat_details.findById({ _id: chatId });
    if (!findChat) {
      return res.status(401).json({ message: "chat id not found" });
    }
    const checkuseringroup = findChat.groupAdmin.includes(userId);

    res.status(200).json({ message: checkuseringroup });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const makeUserAdmin = createAsyncError(async (req, res) => {
  const { chatId, userId, check } = req.body;
  try {
    const findChat = await tbl_user_chat_details.findById({ _id: chatId });
    if (!findChat) {
      return res.status(401).json({ message: "chat id not found" });
    }

    const checkuseringroup = findChat.users.includes(userId);
    const checkuserinadmin = findChat.groupAdmin.includes(req.userInfo._id);
    const checkaddwalaadmin = findChat.groupAdmin.includes(userId);

    if (check == false) {
      if (checkaddwalaadmin) {
        return res.status(200).json({ message: "user is already an admin" });
      }

      if (checkuseringroup && checkuseringroup) {
        const createAdming = await tbl_user_chat_details.findByIdAndUpdate(
          { _id: chatId },
          {
            $push: { groupAdmin: userId },
          },
          {
            new: true,
          }
        );
        return res.status(200).json({ message: "make admin" });
      }
    } else if (check == true) {
      if (checkuseringroup && checkuseringroup) {
        const removeAdming = await tbl_user_chat_details.findByIdAndUpdate(
          { _id: chatId },
          {
            $pull: { groupAdmin: userId },
          },
          {
            new: true,
          }
        );

        return res.status(200).json({ message: removeAdming });
      }
    }

    // res.json({message : checkuseringroup})
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const getChatProfile = createAsyncError(async (req, res) => {
  const { chatId } = req.body;
  try {
    const findChat = await tbl_user_chat_details.findById({ _id: chatId });
    if (!findChat) {
      return res.status(401).json({ message: "chat id not found 5" });
    }

    const response = {
      description: findChat.description,
      groupName: findChat.groupName,
      createdTime: findChat.createdAt,
    };
    if (findChat.groupProfileImgId) {
      const findGroupImg = await tbl_user_chat_group_profile.findById({
        _id: findChat.groupProfileImgId,
      });
      response.groupProfileImg = await GetObject(findGroupImg.customName);
    }

    if (findChat.groupSuperAdmin) {
      const superadmin = await tbl_user.findById({
        _id: findChat.groupSuperAdmin,
      });
      response.superAdminName = await superadmin.fname;
      response.superAdminUsername = await superadmin.username;
      response.superAdminId = await superadmin._id;
    }

    res.status(200).json({ response });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const updateChatProfile = createAsyncError(async (req, res) => {
  const { chatId, groupName } = req.body;
  try {
    const findChat = await tbl_user_chat_details.findById({ _id: chatId });
    if (!findChat) {
      return res.status(401).json({ message: "chat id not found" });
    }

    const checkUser = findChat.users.includes(req.userInfo._id);
    if (checkUser) {
      const update = await tbl_user_chat_details.findByIdAndUpdate(
        { _id: chatId },
        { groupName: groupName },
        { new: true }
      );

      return res.status(201).json({ message: "update successfully" });
    } else {
      return res.status(401).json({ message: "you can't update in group" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong  !", err: err.message });
    console.log(err.message);
  }
});

const getChatEMMessage = createAsyncError(async (req, res) => {
  const { chatId } = req.body;
  try {
    const checkconnection = await tbl_user_chat_details.findById({
      _id: chatId,
    });
    if (!checkconnection) {
      return res.status(401).json({ message: "connection not yet" });
    }
    const otherUserId = checkconnection.users.filter(
      (e) => e != req.userInfo._id.toString()
    );

    const getmymessage = await tbl_user_chat_message.find({
      // senderUserId: req.userInfo._id,
      receiverUserId: otherUserId[0],
      chatId: chatId,
    });

    const getpartnermessage = await tbl_user_chat_message.find({
      receiverUserId: req.userInfo._id,
      // senderUserId: otherUserId[0],
      chatId: chatId,
    });

    // const createdelete = await tbl_soft_corner_delete_message.find({
    // chatId: chatId,
    // deletedBySCId: softCornerInfo,
    // });

    // const messIds = createdelete.map((e) => e.deleteMessageId.toString());

    // const filterdata = getpartnermessage.filter(
    // (q) => !messIds.includes(q._id.toString())
    // );

    let allData = [...getmymessage, ...getpartnermessage];

    allData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // const checkclear = await tbl_soft_corner_clear_chat.findOne({
    // scUserId: softCornerInfo,
    // chatId: chatId,
    // });

    // if (checkclear && checkclear.clearTime) {
    // allData = allData.filter(
    // (e) => new Date(e.createdAt) > new Date(checkclear.clearTime)
    // );
    // }

    const presignedUrls = await Promise.all(
      allData.map(async (x) => {
        const decryptedMessage = decrypt(x.message, key);
        const response = {
          message: decryptedMessage,
          messageId: x._id,
          // replyMessageId: x.replyMessageId,
          // replyMessage : x.replyMessageId ,
          senderUserId: x.senderUserId,
          receiverUserId: x.receiverUserId,
          side:
            req.userInfo._id == x.senderUserId.toString() ? "left" : "right",
          createdTime: x.createdAt,
          chatId: x.chatId,
          // currentTime
        };

        if (x.replyMessageId) {
          const findReply = await tbl_user_chat_message.findById({
            _id: x.replyMessageId,
          });
          response.replyMessageId = x.replyMessageId;
          response.replyMessage = findReply.message;
        }

        return response;
      })
    );
    res.status(200).json({ message: presignedUrls });
  } catch (err) {
    res.status(500).json({ message: "something went wrong !" });
    console.log(err);
  }
});

const createEMNotifyConnection = createAsyncError(async (req, res) => {
  const { postId, reelId, memeId, bestclipId } = req.body;
  try {
    const bab = await tbl_post.findById({ _id: postId });
    const userId = await bab.postedBy;
    const x = await req.userInfo._id;
    const isChat2 = await tbl_user_notification_connection.find({
      $and: [
        { users: { $elemMatch: { $eq: userId } } },
        { users: { $elemMatch: { $eq: req.userInfo._id } } },
      ],
    });

    if (isChat2.length >= 1) {
      return res.status(200).json({ notificationId: isChat2[0]._id });
    }

    const checkchatid = await tbl_user_notification_connection.create({
      users: [userId, x],
    });
    res.status(201).json({ notificationId: checkchatid._id });
  } catch (err) {
    res.status(500).json({ message: "something went wrong !" });
    console.log(err);
  }
});

const createEMNotification = createAsyncError(async (req, res) => {
  const {
    postId,
    reelId,
    memeId,
    bestclipId,
    type,
    action,
    userId,
    followId,
    comment,
    parentCommentId,
    childCommentId,
  } = req.body;
  try {
    let createLikeNotify;
    let postdetails;
    let tumbnailImg;
    let findTumbnailId;
    let findImg;
    let postImg;
    let deletenoti;
    let parentCommentDetails;
    let childCommentDetails;

    if (postId) {
      postdetails = await tbl_post.findById({ _id: postId });

      findTumbnailId = await tbl_post_tumbnail.findById(
        postdetails.postTumbnailId
      );

      findImg = await tbl_post_image.findById(postdetails.imageId[0]);
      if (parentCommentId) {
        parentCommentDetails = await tbl_post_comment.findById({
          _id: parentCommentId,
        });
      } else if (childCommentId) {
        childCommentDetails = await tbl_post_child_comment.findById({
          _id: childCommentId,
        });
      }
    } else if (memeId) {
      postdetails = await tbl_post_meme.findById({ _id: memeId });

      findTumbnailId = await tbl_post_meme_imgvideo_tumbnail.findById(
        postdetails.memeTumbnailId
      );

      findImg = await tbl_post_meme_imgvideo.findById(
        postdetails.memeImgVideoId[0]
      );
      if (parentCommentId) {
        parentCommentDetails = await tbl_post_meme_comment.findById({
          _id: parentCommentId,
        });
      } else if (childCommentId) {
        childCommentDetails = await tbl_post_meme_child_comment.findById({
          _id: childCommentId,
        });
      }
    } else if (bestclipId) {
      postdetails = await tbl_post_bestclip.findById({ _id: bestclipId });

      findTumbnailId = await tbl_post_bestclip_tumbnail_img.findById(
        postdetails.bestclipTumbnailImgId
      );

      findImg = await tbl_post_bestclip_imgvideo.findById(
        postdetails.bestclipImgVideoId[0]
      );
      if (parentCommentId) {
        parentCommentDetails = await tbl_post_bestclip_comment.findById({
          _id: parentCommentId,
        });
      } else if (childCommentId) {
        childCommentDetails = await tbl_bestclip_child_comment.findById({
          _id: childCommentId,
        });
      }
    } else if (reelId) {
      postdetails = await tbl_post_reel.findById({ _id: reelId });

      findTumbnailId = await tbl_reel_tumbnail_img.findById(
        postdetails.tumbnailImgId
      );
      if (parentCommentId) {
        parentCommentDetails = await tbl_reel_comment.findById({
          _id: parentCommentId,
        });
      } else if (childCommentId) {
        childCommentDetails = await tbl_post_reel_child_comment.findById({
          _id: childCommentId,
        });
      }
    } else if (followId) {
      const followuser = await tbl_user_follow.findById({ _id: followId });
    }

    const findUser = await tbl_user.findById({ _id: req.userInfo._id });
    let profileImg;
    if (findUser.imageId) {
      profileImg = await getProfileImage(findUser.imageId);
    }

    postImg = findImg ? await GetObject(findImg.customName) : "";

    tumbnailImg = findTumbnailId
      ? await GetObject(findTumbnailId.customName)
      : "";
    const postname = postId
      ? "post"
      : memeId
      ? "meme"
      : bestclipId
      ? "bestclip"
      : "reel";
    if (type === "like") {
      if (action == "like") {
        createLikeNotify = await tbl_user_notification.create({
          type: "like",
          senderUserId: req.userInfo._id,
          receiverUserId: postdetails.postedBy,
          postId: postId,
          bestclipId: bestclipId,
          memeId: memeId,
          reelId: reelId,
        });

        return res.status(201).json({
          postImg,
          tumbnailImg,
          type: "like",
          action: "like",
          message: `liked your ${postname}`,
          profileImg,
          postId: postId && postId,
          memeId: memeId && memeId,
          bestclipId: bestclipId && bestclipId,
          reelId: reelId && reelId,
          createdTime: createLikeNotify.createdAt,
          senderUserId: req.userInfo._id,
          username: findUser.username,
          fname: findUser.fname,
          likeCount: 7,
          receiverUserId: createLikeNotify.receiverUserId,
        });
      } else if (action == "dislike") {
        deletenoti = await tbl_user_notification.deleteMany({
          type: "like",
          senderUserId: req.userInfo._id,
          receiverUserId: postdetails.postedBy,
          postId: postId && postId,
          bestclipId: bestclipId && bestclipId,
          memeId: memeId && memeId,
          reelId: reelId && reelId,
        });
        return res.status(200).json({
          type: "like",
          action: "dislike",
          postId: postId && postId,
          senderUserId: req.userInfo._id,
          memeId: memeId && memeId,
          receiverUserId: postdetails.postedBy,
          bestclipId: bestclipId && bestclipId,
          reelId: reelId && reelId,
        });
      }
    } else if (type === "follow") {
      if (action == "follow") {
        createLikeNotify = await tbl_user_notification.create({
          type: "follow",
          senderUserId: req.userInfo._id,
          receiverUserId: userId,
          followId: followId,
        });

        return res.status(200).json({
          type: "follow",
          action: "follow",
          receiverUserId: createLikeNotify.receiverUserId,
          createdTime: createLikeNotify.createdAt,
          senderUserId: req.userInfo._id,
          username: findUser.username,
          fname: findUser.fname,
          followId: followId,
          message: "Started following you",
          profileImg,
        });
      } else if (action == "unfollow") {
        deletenoti = await tbl_user_notification.deleteMany({
          type: "follow",
          senderUserId: req.userInfo._id,
          receiverUserId: userId,
        });
        return res.status(200).json({
          type: "follow",
          action: "unfollow",
          receiverUserId: createLikeNotify.receiverUserId,
          followId: followId,
        });
      }
    } else if (type == "parentcomment") {
      createLikeNotify = await tbl_user_notification.create({
        type: "parentcomment",
        senderUserId: req.userInfo._id,
        parentCommentId: parentCommentDetails._id,
        receiverUserId: postdetails.postedBy,
        postId: postId,
        bestclipId: bestclipId,
        memeId: memeId,
        reelId: reelId,
      });

      return res.status(201).json({
        postImg,
        tumbnailImg,
        type: "parentcomment",
        message: `commented on your ${postname} : ${parentCommentDetails.comment}`,
        profileImg,
        // prentComment : pren
        postId: postId && postId,
        memeId: memeId && memeId,
        bestclipId: bestclipId && bestclipId,
        reelId: reelId && reelId,
        createdTime: createLikeNotify.createdAt,
        senderUserId: req.userInfo._id,
        username: findUser.username,
        fname: findUser.fname,
        receiverUserId: createLikeNotify.receiverUserId,
      });
    } else if (type == "childcomment") {
      createLikeNotify = await tbl_user_notification.create({
        type: "childcomment",
        childCommentId: childCommentDetails._id,
        senderUserId: req.userInfo._id,
        receiverUserId: postdetails.postedBy,
        postId: postId,
        bestclipId: bestclipId,
        memeId: memeId,
        reelId: reelId,
      });

      const reply = await tbl_user.findById({
        _id: childCommentDetails.replayingCommentUserId,
      });

      return res.status(201).json({
        postImg,
        tumbnailImg,
        type: "childcomment",
        message: `Commented on your ${postname} : ${comment}`,
        repliedUserName: reply.username,
        repliedfname: reply.fname,
        repliedUserId: reply._id,
        childCommentId: childCommentDetails._id,
        profileImg,
        postId: postId && postId,
        memeId: memeId && memeId,
        bestclipId: bestclipId && bestclipId,
        reelId: reelId && reelId,
        createdTime: createLikeNotify.createdAt,
        senderUserId: req.userInfo._id,
        username: findUser.username,
        fname: findUser.fname,
        receiverUserId: createLikeNotify.receiverUserId,
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong !", err: err.message });
    console.log(err);
  }
});

const getEMNotification = createAsyncError(async (req, res) => {
  try {
    const getnotification = await tbl_user_notification
      .find({ receiverUserId: req.userInfo._id })
      .sort({ createdAt: -1 });

    const post = await Promise.all(
      getnotification.map(async (x) => {
        let postdetails,
          findTumbnailId,
          findImg,
          postImg,
          tumbnailImg,
          parentCommentDetails,
          childCommentDetails;

        if (x.postId) {
          postdetails = await tbl_post.findById({ _id: x.postId });

          findTumbnailId = await tbl_post_tumbnail.findById(
            postdetails.postTumbnailId
          );

          findImg = await tbl_post_image.findById(postdetails.imageId[0]);

          if (x.parentCommentId) {
            parentCommentDetails = await tbl_post_comment.findById({
              _id: x.parentCommentId,
            });
          } else if (x.childCommentId) {
            childCommentDetails = await tbl_post_child_comment.findById({
              _id: x.childCommentId,
            });
          }
        } else if (x.memeId) {
          postdetails = await tbl_post_meme.findById({ _id: x.memeId });

          findTumbnailId = await tbl_post_meme_imgvideo_tumbnail.findById(
            postdetails.memeTumbnailId
          );

          findImg = await tbl_post_meme_imgvideo.findById(
            postdetails.memeImgVideoId[0]
          );
          if (x.parentCommentId) {
            parentCommentDetails = await tbl_post_meme_comment.findById({
              _id: x.parentCommentId,
            });
          } else if (x.childCommentId) {
            childCommentDetails = await tbl_post_meme_child_comment.findById({
              _id: x.childCommentId,
            });
          }
        } else if (x.bestclipId) {
          postdetails = await tbl_post_bestclip.findById({ _id: x.bestclipId });

          findTumbnailId = await tbl_post_bestclip_tumbnail_img.findById(
            postdetails.bestclipTumbnailImgId
          );

          findImg = await tbl_post_bestclip_imgvideo.findById(
            postdetails.bestclipImgVideoId[0]
          );
          if (x.parentCommentId) {
            parentCommentDetails = await tbl_post_bestclip_comment.findById({
              _id: x.parentCommentId,
            });
          } else if (x.childCommentId) {
            childCommentDetails = await tbl_bestclip_child_comment.findById({
              _id: x.childCommentId,
            });
          }
        } else if (x.reelId) {
          postdetails = await tbl_post_reel.findById({ _id: x.reelId });

          findTumbnailId = await tbl_reel_tumbnail_img.findById(
            postdetails.tumbnailImgId
          );
          if (x.parentCommentId) {
            parentCommentDetails = await tbl_reel_comment.findById({
              _id: x.parentCommentId,
            });
          } else if (x.childCommentId) {
            childCommentDetails = await tbl_post_reel_child_comment.findById({
              _id: x.childCommentId,
            });
          }
        }

        postImg = findImg ? await GetObject(findImg.customName) : "";

        tumbnailImg = findTumbnailId
          ? await GetObject(findTumbnailId.customName)
          : "";
        const findUser = await tbl_user.findById({ _id: x.senderUserId });
        const postname = x.postId
          ? "post"
          : x.memeId
          ? "meme"
          : x.bestclipId
          ? "bestclip"
          : "reel";
        let response;
        if (x.type == "like") {
          response = {
            tumbnailImg: tumbnailImg,
            postImg: postImg,
            senderUserId: x.senderUserId,
            receiverUserId: x.receiverUserId,
            createdAt: x.createdAt,
            postId: x.postId && x.postId,
            memeId: x.memeId && x.memeId,
            reelId: x.reelId && x.reelId,
            bestclipId: x.bestclipId && x.bestclipId,
            username: findUser.username,
            fname: findUser.fname,
            likeCount: 7,
            message: `liked your ${postname}`,
          };
        } else if (x.type == "follow") {
          response = {
            createdAt: x.createdAt,
            username: findUser.username,
            fname: findUser.fname,
            followId: x.followId,
            senderUserId: x.senderUserId,
            receiverUserId: x.receiverUserId,
            message: "Started following you",
          };
        } else if (x.type == "parentcomment" && x.parentCommentId) {
          response = {
            tumbnailImg: tumbnailImg,
            postImg: postImg,
            senderUserId: x.senderUserId,
            receiverUserId: x.receiverUserId,
            createdAt: x.createdAt,
            postId: x.postId && x.postId,
            memeId: x.memeId && x.memeId,
            reelId: x.reelId && x.reelId,
            bestclipId: x.bestclipId && x.bestclipId,
            username: findUser.username,
            fname: findUser.fname,
            parentCommentId: parentCommentDetails._id,
            message: `commented on your ${postname} : ${parentCommentDetails.comment}`,
          };
        } else if (x.type == "childcomment" && x.childCommentId) {
          const reply = await tbl_user.findById({
            _id: childCommentDetails.replayingCommentUserId,
          });
          response = {
            tumbnailImg: tumbnailImg,
            postImg: postImg,
            senderUserId: x.senderUserId,
            receiverUserId: x.receiverUserId,
            createdAt: x.createdAt,
            repliedUserName: reply.username,
            repliedfname: reply.fname,
            repliedUserId: reply._id,
            postId: x.postId && x.postId,
            memeId: x.memeId && x.memeId,
            reelId: x.reelId && x.reelId,
            bestclipId: x.bestclipId && x.bestclipId,
            username: findUser.username,
            fname: findUser.fname,
            childCommentId: childCommentDetails._id,
            message: `commented on your ${postname} : ${childCommentDetails.comment}`,
          };
        }

        if (findUser.imageId) {
          response.profileImg = await getProfileImage(findUser.imageId);
        }
        response.type = x.type;

        return response;
      })
    );

    res.status(200).json({ message: post });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong !", err: err.message });
    console.log(err);
  }
});

const deleteCommentEMInNotify = createAsyncError(async (req, res) => {
  const { parentCommentId, postId, memeId, bestclipId, reelId } = req.body;
  try {
    const findComment = await tbl_user_notification.find({
      parentCommentId,
      postId,
      memeId,
      bestclipId,
      reelId,
    });

    if (findComment.length == 0) {
      return res.status(200).json({ message: "comment not found" });
    }
    const deletecom = await tbl_user_notification.deleteMany({
      parentCommentId,
      postId,
      memeId,
      bestclipId,
      reelId,
    });
    res.status(200).json({ message: "parent comment delete successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "something went wrong !", err: err.message });
    console.log(err);
  }
});

export {
  createEMChatConnection,
  createEMMessage,
  listEMChat,
  getChatEMMessage,
  createEMNotifyConnection,
  createEMNotification,
  getEMNotification,
  chatUserList,
  checkUserAdmin,
  makeUserAdmin,
  getChatProfile,
  updateChatProfile,
  deleteCommentEMInNotify,
};
