const { gql } = require("apollo-server");

module.exports = gql`
  type User {
    id: ID!
    phoneNumber: String!
    token: String
    name: String!
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
    getUserConversations: [Conversation]!
    getConversation(conversationId: ID!): Conversation!
  }

  type Message {
    id: ID!
    text: String
    picture: String
    video: String
    sender: User!
    createdAt: String!
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
    register(phoneNumber: String!, name: String!): User!
    login(phoneNumber: String!): User!

    # create conversation
    createConversation(
      createConversationInput: ConversationInput
    ): Conversation!

    # create message
    createMessage(createMessageInput: MessageInput): Message!

    # delete message
    deleteMessage(conversationId: String!, messageId: String!): Boolean!

    # create conversation
    # createConversation(
    #   participants: [String]!
    #   messages: [String]
    # ): Conversation!
  }

  type Subscription {
    newConversation: Conversation!
    newMessage: Message!
  }
`;
