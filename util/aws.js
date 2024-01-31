import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

export { PutObject };
