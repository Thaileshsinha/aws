import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// aws s3 credentials
const s3Client = new S3Client({
  region: "enter region",
  credentials: {
    accessKeyId: "enter access key id",
    secretAccessKey: "enter access key",
  },
});

// put the single image or in later multiple at a time
const PutObject = async (Keys, Bodys, ContentTypes) => {
  const params = {
    Bucket: "enter you bucket name of aws s3",
    Key: Keys,
    Body: Bodys,
    ContentType: ContentTypes,
  };
  try {
    const command = new PutObjectCommand(params);

    const sss = await s3Client.send(command);
  } catch (err) {
    console.log(err.message);
  }
};

const GetObject = async (Keys) => {
  const params = {
    Bucket: "enter you bucket name",
    Key: Keys,
  };
  const command = new GetObjectCommand(params);

  const url = await getSignedUrl(s3Client, command);
  return url;
};

//delete image from aws s3
const DeleteObject = async (Keys) => {
  const params = {
    Bucket: "enter you bucket name",
    Key: Keys,
  };

  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

export { PutObject, GetObject, DeleteObject };
