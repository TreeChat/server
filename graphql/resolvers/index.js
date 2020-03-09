const usersResolvers = require("./users");
const conversationsResolvers = require("./conversations");
const messagesResolvers = require("./messages");

module.exports = {
  Query: {
    ...conversationsResolvers.Query,
    ...usersResolvers.Query,
    ...messagesResolvers.Query
  },
  Mutation: {
    ...usersResolvers.Mutation,
    ...conversationsResolvers.Mutation,
    ...messagesResolvers.Mutation
  },
  Subscription: {
    ...usersResolvers.Subscription,
    ...conversationsResolvers.Subscription,
    ...messagesResolvers.Subscription
  }
};
