const usersResolvers = require("./users");
const conversationsResolvers = require("./conversations");
const messagesResolvers = require("./messages");

module.exports = {
  Query: {
    ...conversationsResolvers.Query
  },
  Mutation: {
    ...usersResolvers.Mutation,
    ...conversationsResolvers.Mutation,
    ...messagesResolvers.Mutation
  },
  Subscription: {
    ...conversationsResolvers.Subscription,
    ...messagesResolvers.Subscription
  }
};
