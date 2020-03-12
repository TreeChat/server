const { gql } = require("apollo-server");

module.exports = gql`
  type User {
    id: ID!
    phoneNumber: String!
    token: String
    name: String
    avatar: String
    createdAt: String!
    conversations: [Conversation]
  }
  input RegisterInput {
    name: String!
    phoneNumber: String!
  }
  type Query {
    me: User!
    getUserConversations: [Conversation]
    getConversation(conversationId: ID!): Conversation!
    getMessage(messageId: ID!): Message!
    getContacts(contacts: [String]!): [User]
  }

  type Message {
    id: ID!
    text: String
    picture: String
    video: String
    sender: User!
    createdAt: String!
    conversation: String
  }

  input MessageInput {
    text: String
    picture: String
    video: String
    conversation: String!
  }

  type Conversation {
    id: ID!
    participants: [User]!
    participantsIds: [String]!
    messages: [Message]
    createdAt: String
  }

  input ConversationInput {
    recipients: [String]!
  }

  type Mutation {
    register(phoneNumber: String!): User!
    login(phoneNumber: String!): User!
    # create conversation
    createConversation(recipients: [String]!): Conversation!

    # create message
    createMessage(createMessageInput: MessageInput): Conversation!

    # delete message
    deleteMessage(conversationId: String!, messageId: String!): Boolean!
  }

  type Subscription {
    newConversation: Conversation!
    newMessage(conversationId: String!): Message!
    newUser: User!
  }
`;
