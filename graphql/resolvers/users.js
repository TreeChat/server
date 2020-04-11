const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");
const PhoneNumber = require("awesome-phonenumber");
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER
} = require("../../config/keys");
const {
  validateRegisterInput
} = require("../../utils/validation/validate-register");
const { validateLoginInput } = require("../../utils/validation/validate-login");
const checkAuth = require("../../utils/auth/checkAuth");

const { SECRET_KEY } = require("../../config/keys");
const { User } = require("../../models");
const { Conversation } = require("../../models");

// TWILIO CONFIG
const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

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
    async register(obj, { phoneNumber, country = "" }, context, info) {
      // 0. Check if phone number has good behavior with intl indic
      const pn = new PhoneNumber(phoneNumber, country.toUpperCase());
      if (!pn.isValid()) {
        throw new Error("Phone number is not valid");
      }

      const number = pn.getNumber("e164");
      const code = Math.floor(100000 + Math.random() * 900000);

      // 1. Check if user exists and send message
      const user = await User.findOne({ phoneNumber: number });
      if (user) {
        let userUpdated = await User.findOneAndUpdate(
          { _id: user.id },
          {
            $set: {
              verify_code: code,
              verify_code_date: new Date()
            }
          },
          { new: true }
        );

        // Send code and return boolean
        try {
          const res = await client.messages.create({
            body: `This is your verify code to access TreeChat App : ${code}`,
            from: TWILIO_PHONE_NUMBER,
            to: number
          });
          if (res) {
            return userUpdated;
          }
        } catch (error) {
          throw new Error(error);
        }
      }
      // 2. if it does not exist, create User and send message
      const newUser = new User({
        phoneNumber: number,
        verify_code: code,
        verify_code_date: new Date()
      });
      await newUser.save();
      // Send code and return boolean
      try {
        const res = await client.messages.create({
          body: `This is your verify code to access TreeChat App : ${code}`,
          from: TWILIO_PHONE_NUMBER,
          to: number
        });
        if (res) {
          return newUser;
        }
      } catch (error) {
        throw new Error(error);
      }
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
    },
    async verifyUserPhoneNumber(
      _,
      { phoneNumber = "", country = "", verify_code = "" },
      context
    ) {
      if (phoneNumber.length < 1 || verify_code.length < 1) {
        throw new Error("Phone number and code are required.");
      }

      const pn = new PhoneNumber(phoneNumber, country.toUpperCase());
      if (!pn.isValid()) {
        throw new Error("Phone number is not valid");
      }

      let number = pn.getNumber("e164");

      try {
        var d = new Date();
        d.setHours(d.getHours() - 1);
        let user = await User.findOne({
          $and: [
            { phoneNumber: number },
            { verify_code: verify_code },
            {
              verify_code_date: { $gt: d }
            }
          ]
        });
        if (user) {
          const token = generateToken(user);
          context.pubsub.publish("NEW_USER", {
            newUser: user
          });
          return {
            ...user._doc,
            id: user._id,
            token
          };
        } else {
          throw new Error(
            "No User found - Wrong / out of date code provided. "
          );
        }
      } catch (err) {
        throw new Error("No User found - Wrong / out of date code provided. ");
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
