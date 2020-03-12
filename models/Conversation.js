const { model, Schema } = require("mongoose");
const timestamp = require("mongoose-timestamp");

const conversationSchema = new Schema({
  participants: [
    {
      name: String,
      phoneNumber: String,
      id: String
    }
  ],
  participantsIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "users"
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
conversationSchema.plugin(timestamp);

module.exports = model("Conversation", conversationSchema);
