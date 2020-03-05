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
      text: String,
      picture: String,
      video: String,
      sender: {
        name: String,
        phoneNumber: String,
        id: String
      },
      createdAt: String
    }
  ]
});

// Will add createdAt and updatedAt date automatically
conversationSchema.plugin(timestamp);

module.exports = model("Conversation", conversationSchema);
