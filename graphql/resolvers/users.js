const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const {
  validateRegisterInput
} = require("../../utils/validation/validate-register");
const { validateLoginInput } = require("../../utils/validation/validate-login");
const checkAuth = require("../../utils/auth/checkAuth");

const { SECRET_KEY } = require("../../config/keys");
const { User } = require("../../models");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name
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
    async register(_, { name, phoneNumber }) {
      // 1. Validate user data
      const { valid, errors } = validateRegisterInput(name, phoneNumber);
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      // 2. Make sure user doesn't already exist
      const user = await User.findOne({ phoneNumber });
      if (user) {
        throw new UserInputError("Phone Number is taken", {
          errors: {
            phoneNumber: "Phone Number is taken"
          }
        });
      }
      // 3. Create User and create a token
      const newUser = new User({
        name,
        phoneNumber,
        avatar: ""
      });
      const res = await newUser.save();
      const token = generateToken(res);
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
      return user;
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
  }
};
