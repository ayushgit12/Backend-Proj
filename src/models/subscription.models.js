import mongoose from "mongoose";
import { User } from "./user.models";

const subscriptionSchema = new mongoose.Schema({
     channel: {
          type: Schema.Types.ObjectId,
          ref: User,
          required: true
     },
     subscriber: {
          type: Schema.Types.ObjectId,
          ref: User
     }
},
     {timestamps: true}
)

export const Subscription = mongoose.model('Subscription', subscriptionSchema)