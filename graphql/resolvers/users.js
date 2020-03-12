const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const {
  validateRegisterInput
} = require("../../utils/validation/validate-register");
const { validateLoginInput } = require("../../utils/validation/validate-login");
const checkAuth = require("../../utils/auth/checkAuth");

const { SECRET_KEY } = require("../../config/keys");
const { User } = require("../../models");
const { Conversation } = require("../../models");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phoneNumber: user.phoneNumber
    },
    SECRET_KEY,
    { expiresIn: "12h" }
  );
}
module.exports = {
  Mutation: {
    async login(_, { phoneNumber }) {
      const { errors, valid } = validateLoginInput(phoneNumber);

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ phoneNumber });

      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", { errors });
      }

      const token = generateToken(user);
      return {
        ...user._doc,
        id: user._id,
        token
      };
    },
    async register(_, { phoneNumber }, context) {
      // // 1. Validate user data
      // const { valid, errors } = validateRegisterInput(name, phoneNumber);
      // if (!valid) {
      //   throw new UserInputError("Errors", { errors });
      // }

      // 1. Check if user exists
      const user = await User.findOne({ phoneNumber });
      if (user) {
        // return user and token
        const token = generateToken(user);
        return {
          ...user._doc,
          id: user._id,
          token
        };
      }
      // 2. if it does not exist, create User and create a token
      const newUser = new User({
        phoneNumber
      });
      const res = await newUser.save();
      const token = generateToken(res);
      context.pubsub.publish("NEW_USER", {
        newUser: res
      });
      return {
        ...res._doc,
        id: res._id,
        token
      };
    }
  },
  Query: {
    async me(obj, args, context, info) {
      // Check User
      const user = checkAuth(context);
      // Return User
      const u = await User.findById(user.id).populate("conversations");
      return u;
    },
    async getContacts(obj, { contacts }, context, info) {
      const user = checkAuth(context);
      // Filter User base with contacts phoneNumber
      try {
        const users = await User.find({ phoneNumber: { $in: contacts } });
        return users;
      } catch (err) {
        throw new Error(err);
      }
    }
  },
  Subscription: {
    newUser: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("NEW_USER")
    }
  }
};
