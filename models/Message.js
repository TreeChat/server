const { model, Schema } = require("mongoose");
const timestamp = require("mongoose-timestamp");
const crypto = require("crypto");
const { ENCRYPTION_KEY } = require("../config/keys");
const IV_LENGTH = 16; // For AES, this is always 16

const messageSchema = new Schema({
  text: String,
  picture: String,
  video: String,
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: "conversations"
  },
  recipients: [
    {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  ]
});

messageSchema.plugin(timestamp);

// Crypt messages at saving
messageSchema.pre("save", function(next, done) {
  if (this.text) {
    let encr = encrypt(this.text);
    this.text = encr;
    next();
  } else {
    next();
  }
});

// Decrypt message before find
messageSchema.post("init", function(doc) {
  if (doc.text) {
    let decr = decrypt(doc.text);
    doc.text = decr;
  }
});

// Will add createdAt and updatedAt date automatically

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  let textParts = text.split(":");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

module.exports = model("Message", messageSchema);
