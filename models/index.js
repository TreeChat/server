const UserSchema = require("./User");
const MessageSchema = require("./Message");
const ConversationSchema = require("./Conversation");

module.exports = {
  User: UserSchema,
  Message: MessageSchema,
  Conversation: ConversationSchema
};
