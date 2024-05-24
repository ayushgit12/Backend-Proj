import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
     comment: {
          type: Scheme.Types.ObjectId,
          ref: "Comment",
          // required: true
     },
     video: {
          type: Scheme.Types.ObjectId,
          ref: "Video",
          // required: true
     },
     likedBy: {
          type: Scheme.Types.ObjectId,
          ref: "User",
          required: true
     },
     tweet: {
          type: Schema.Types.ObjectId,
          ref: "Tweet"
     }
     
},
{
     timestamps: true
});            


export const Like = mongoose.model("Like", likeSchema);