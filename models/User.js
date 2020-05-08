const { model, Schema } = require("mongoose");
const timestamp = require("mongoose-timestamp");

const userSchema = new Schema({
  name: String,
  avatar: String,
  phoneNumber: String,
  verify_code: Number,
  verify_code_date: Date,
  contacts: [
    {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  conversations: [
    {
      type: Schema.Types.ObjectId,
      ref: "Conversation"
    }
  ],
  messages: [
    {
      type: Schema.Types.ObjectId,
      ref: "Message"
    }
  ]
});

// Will add createdAt and updatedAt date automatically
userSchema.plugin(timestamp);

module.exports = model("User", userSchema);
