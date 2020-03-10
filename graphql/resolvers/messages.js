const { AuthenticationError, UserInputError } = require("apollo-server");

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const checkAuth = require("../../utils/auth/checkAuth");

module.exports = {
  // Queries
  Query: {
    async getMessage(obj, { messageId }, context, info) {
      const user = checkAuth(context);
      // Fetch user conversations
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          throw new UserInputError("No Message found.");
        }
        return message;
      } catch (error) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    async createMessage(
      _,
      { createMessageInput: { text, picture, video, conversation } },
      context
    ) {
      // Check User
      const user = checkAuth(context);
      // Check if message has required fields
      if (!text && !picture && !video) {
        throw new UserInputError("Please select at least one type of content.");
      }

      // Check if a conversation exist
      const conv = await Conversation.findById(conversation.toString());
      if (!conv) {
        throw new UserInputError("Conversation not found");
      }

      // Create new message object

      const newMessage = {
        sender: {
          name: user.name,
          phoneNumber: user.phoneNumber,
          id: user.id
        },
        createdAt: new Date().toISOString()
      };
      if (text) newMessage.text = text;
      if (picture) newMessage.picture = picture;
      if (video) newMessage.video = video;

      // Update conversation document with the message
      await conv.update({
        $push: { messages: newMessage }
      });
      // Save Message
      const newMess = new Message({
        text: newMessage.text ? newMessage.text : "",
        picture: newMessage.picture ? newMessage.picture : "",
        video: newMessage.video ? newMessage.video : "",
        sender: user.id,
        conversation: conv.id
        // recipients: conversation.participantsIds
      });
      const saveMessage = await newMess.save();
      context.pubsub.publish("NEW_MESSAGE", {
        newMessage: saveMessage
      });
      return conv;
    },
    async deleteMessage(_, { conversationId, messageId }, context) {
      // Check User
      const user = checkAuth(context);
      // Check for message id
      try {
        const conversation = await Conversation.findById(conversationId);

        const messageIndex = conversation.messages.findIndex(
          m => m.id.toString() === messageId.toString()
        );
        if (messageIndex === null || messageIndex === undefined) {
          throw new UserInputError(
            "Message Id and Conversation id do not match"
          );
        }

        if (
          conversation.messages[messageIndex].sender.id.toString() ===
          user.id.toString()
        ) {
          conversation.messages.splice(messageId, 1);
          await conversation.save();
          return true;
        } else {
          throw new AuthenticationError("Action not allowed");
        }
      } catch (error) {
        throw new UserInputError("An Error occured when deleting the message.");
      }
    }
  },
  Subscription: {
    newMessage: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("NEW_MESSAGE")
    }
  }
};
