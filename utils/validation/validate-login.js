module.exports.validateLoginInput = phoneNumber => {
  const errors = {};

  if (phoneNumber.trim() === "") {
    errors.phoneNumber = "Phone Number must not be empty.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1
  };
};
