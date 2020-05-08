const { AuthenticationError, UserInputError } = require("apollo-server");

const User = require("../../models/User");
const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const checkAuth = require("../../utils/auth/checkAuth");

module.exports = {
  // Queries
  Query: {
    async getUserConversations(obj, args, context, info) {
      // Check User
      const user = checkAuth(context);
      // Fetch user conversations
      try {
        const userId = user.id;
        const conversations = await Conversation.find({
          participantsIds: { $in: userId }
        })
          .populate({
            path: "messages",
            populate: {
              path: "sender"
            }
          })
          .sort({ createdAt: -1 });
        // Remove current user from participants list
        const parts = conversations[0].participants.filter(
          p => p.id !== user.id
        );
        conversations[0].participants = parts;
        // Add readByCurrentUser for each message for each conv
        conversations.forEach(async conversation => {
          await conversation.messages.forEach(message => {
            message.readByCurrentUser = !message.waitingToReadRecipients.includes(
              user.id.toString()
            );
          });
        });
        return conversations;
      } catch (err) {
        throw new Error(err);
      }
    },
    async getConversation(obj, { conversationId }, context, info) {
      const user = checkAuth(context);
      // Fetch user conversations
      try {
        const conversation = await Conversation.findById(
          conversationId
        ).populate({
          path: "messages",
          populate: {
            path: "sender"
          }
        });
        if (!conversation) {
          throw new UserInputError("No Conversation found.");
        }
        if (!conversation.participantsIds.includes(user.id)) {
          throw new AuthenticationError("Action not allowed");
        }
        // Add readByCurrentUser for each message
        conversation.messages.forEach(message => {
          message.readByCurrentUser = !message.waitingToReadRecipients.includes(
            user.id.toString()
          );
        });
        return conversation;
      } catch (error) {
        throw new Error(error);
      }
    }
  },
  Mutation: {
    async createConversation(_, { recipients }, context) {
      // Check User
      const user = checkAuth(context);

      // Check for Recipients
      if (!recipients || recipients.length < 1) {
        throw new UserInputError(
          "Please select at least one recipient for your conversation."
        );
      }

      // Load all recipients user data
      const recip = await User.find({ _id: { $in: recipients } });
      if (!recip || recip.length < 1) {
        throw new UserInputError("No User found.");
      }

      // save all participants (recipients + user) in new array
      let arrayOfParticipants = [];
      let arrayOfParticipantsIds = [];
      const userObject = {
        name: user.name,
        phoneNumber: user.phoneNumber,
        id: user.id
      };
      arrayOfParticipants.push(userObject);
      arrayOfParticipantsIds.push(user.id.toString());
      recip.forEach(r => {
        let recipientObject = {
          name: r.name,
          phoneNumber: r.phoneNumber,
          id: r._id
        };
        arrayOfParticipants.push(recipientObject);
        arrayOfParticipantsIds.push(r._id.toString());
      });

      // Check that a conversation does not already exist with same people
      const existingConv = await Conversation.find({
        participantsIds: arrayOfParticipantsIds
      });
      if (existingConv && existingConv.length > 0) {
        throw new UserInputError(
          "Conversation already exists with those users."
        );
      } else {
        // save new conversation
        const newConversation = new Conversation({
          participants: arrayOfParticipants,
          participantsIds: arrayOfParticipantsIds
        });
        let convSaved = await newConversation.save();
        // push conversation id in User data for each participants
        convSaved.participantsIds.forEach(async p => {
          const u = await User.findById(p);
          if (u) {
            await u.update({
              $push: { conversations: convSaved._id }
            });
          }
        });

        // publish conv
        context.pubsub.publish("NEW_CONVERSATION", {
          newConversation: convSaved
        });

        return convSaved;
      }
    },
    async readConversation(_, { conversationId }, context) {
      // Check User
      const user = checkAuth(context);

      // Update all messsages with conv id and delete the user id in waitingToReadRecipients array
      try {
        let messages = await Message.updateMany(
          { conversation: conversationId },
          {
            $pull: { waitingToReadRecipients: user.id }
          },
          { multi: true }
        );
        let conv = await Conversation.findById(conversationId)
          .populate({
            path: "messages",
            populate: {
              path: "sender"
            }
          })
          .sort({ createdAt: -1 });
        // Add readByCurrentUser for each message
        conv.messages.forEach(message => {
          message.readByCurrentUser = !message.waitingToReadRecipients.includes(
            user.id.toString()
          );
        });
        // Return
        return conv;
      } catch (error) {
        throw new Error(error);
      }
    }
  },
  Subscription: {
    newConversation: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("NEW_CONVERSATION")
    }
  }
};
