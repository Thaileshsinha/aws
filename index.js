import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
const app = express();
import user from "./routes/route.js";

app.use(bodyParser.urlencoded({ extended: false }));
app.use("*", cors({ origin: true, credentials: true }));

app.use(express.json());

const port = 3000;
const data = "enter you mongodb link";

app.use("/user", user);

app.get("/", (req, res) => {
  res.json("thailesh sinha");
});
mongoose
  .connect(data, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected with database");
  })
  .catch((err) => {
    console.log("err hai");
  });

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
