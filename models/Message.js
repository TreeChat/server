const { model, Schema } = require("mongoose");
const timestamp = require("mongoose-timestamp");

const messageSchema = new Schema({
  text: String,
  picture: String,
  video: String,
  sender: {
    type: Schema.Types.ObjectId,
    ref: "users"
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: "conversations"
  },
  recipients: [
    {
      type: Schema.Types.ObjectId,
      ref: "users"
    }
  ]
});

// Will add createdAt and updatedAt date automatically
messageSchema.plugin(timestamp);

module.exports = model("Message", messageSchema);
