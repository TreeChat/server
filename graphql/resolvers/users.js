const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");
const PhoneNumber = require("awesome-phonenumber");

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
    async login(_, { phoneNumber, country = "" }) {
      const pn = new PhoneNumber(phoneNumber, country.toUpperCase());
      if (!pn.isValid()) {
        throw new Error("Phone number is not valid");
      }

      let number = pn.getNumber("e164");

      const { errors, valid } = validateLoginInput(phoneNumber);

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ phoneNumber: number });

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
    async register(_, { phoneNumber, country = "" }, context) {
      // // 1. Validate user data
      // const { valid, errors } = validateRegisterInput(name, phoneNumber);
      // if (!valid) {
      //   throw new UserInputError("Errors", { errors });
      // }

      // 0. Check if phone number has good behavior with intl indic
      const pn = new PhoneNumber(phoneNumber, country.toUpperCase());
      if (!pn.isValid()) {
        throw new Error("Phone number is not valid");
      }

      let number = pn.getNumber("e164");
      // 1. Check if user exists
      const user = await User.findOne({ phoneNumber: number });
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
        phoneNumber: number
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
    },
    async updateCurrentUser(obj, { name, avatar }, context, info) {
      const user = checkAuth(context);
      // Update User
      try {
        const u = await User.findOneAndUpdate(
          { _id: user.id },
          { $set: { name, avatar } },
          { new: true }
        );
        return u;
      } catch (error) {
        throw new Error(err);
      }
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
      let newArray = [];
      contacts.forEach(contact => {
        const pn = new PhoneNumber(contact);
        if (pn.isValid()) {
          newArray.push(pn.getNumber("e164"));
        }
      });
      try {
        const users = await User.find({ phoneNumber: { $in: newArray } });
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
