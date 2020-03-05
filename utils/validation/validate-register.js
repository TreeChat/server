module.exports.validateRegisterInput = (name, phoneNumber) => {
  const errors = {};
  if (name.trim() === "") {
    errors.name = "Name must not be empty.";
  }

  if (phoneNumber.trim() === "") {
    errors.phoneNumber = "Phone Number must not be empty.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1
  };
};
