const { AuthenticationError, UserInputError } = require("apollo-server");

const User = require("../../models/User");
const Conversation = require("../../models/Conversation");
const checkAuth = require("../../utils/auth/checkAuth");

module.exports = {
  // Queries
  Query: {
    async getUserConversations(obj, args, context, info) {
      // Check User
      const user = checkAuth(context);
      // Fetch user conversations
      try {
        const conversations = await Conversation.find({
          participantsIds: user.id
        }).sort({ createdAt: -1 });
        return conversations;
      } catch (err) {
        throw new Error(err);
      }
    },
    async getConversation(obj, { conversationId }, context, info) {
      const user = checkAuth(context);
      // Fetch user conversations
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          throw new UserInputError("No Conversation found.");
        }
        if (!conversation.participantsIds.includes(user.id)) {
          throw new AuthenticationError("Action not allowed");
        }
        return conversation;
      } catch (error) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    async createConversation(
      _,
      { createConversationInput: { recipients } },
      context
    ) {
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
        console.log("case existing conv");
        throw new Error("A conversation already exists between these people.");
      }

      // save new conversation
      const newConversation = new Conversation({
        participants: arrayOfParticipants,
        participantsIds: arrayOfParticipantsIds
      });
      let convSaved = await newConversation.save();

      context.pubsub.publish("NEW_CONVERSATION", {
        newConversation: convSaved
      });

      return convSaved;
    }
  },
  Subscription: {
    newConversation: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("NEW_CONVERSATION")
    }
  }
};
