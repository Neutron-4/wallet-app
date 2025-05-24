// module.exports = {
//     errorOccurred: { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' },
//     userAlreadyRegistered: { showAlert: true, alertMessage: 'User already registered!', alertType: 'error' },
//     registrationDisabled: { showAlert: true, alertMessage: 'User registrations are currently disabled.', alertType: 'error' },

// const {  } = require("./userController");

// const { logout } = require("./userController");

// };


// alertMessages.js

module.exports = {
  errorOccurred: {
    showAlert: true,
    alertMessage: 'Error occurred',
    alertType: 'error',
  },
  
  fillAllDetails: {
    showAlert: true,
    alertMessage: 'Fill all details !',
    alertType: 'error',
  },
  usernameAlreadyExist: {
    showAlert: true,
    alertMessage: 'Username already in use!',
    alertType: 'error',
  },
  phonenoAlreadyExist: {
    showAlert: true,
    alertMessage: 'Phone no already in use!',
    alertType: 'error',

  },
  userAlreadyRegistered: {
    showAlert: true,
    alertMessage: 'User already registered!',
    alertType: 'error',

  },
  registrationDisabled: {
    showAlert: true,
    alertMessage: 'User registrations are currently disabled.',
    alertType: 'error',
  },
  databaseError: {
    showAlert: true,
    alertMessage: 'Database error',
    alertType: 'error',
  },
  invalidToken: {
    showAlert: true,
    alertMessage: 'Invalid Token or user Already verified !',
    alertType: 'error',
  },
  contactAdminError: {
    showAlert: true,
    alertMessage: 'Something went wrong, contact admin!',
    alertType: 'error',
  },
  emailVerified: {
    showAlert: true,
    alertMessage: 'Email verified successfully!',
    alertType: 'success',
  },
  verifyEmailReminder: {
    showAlert: true,
    alertMessage: 'Verify your email to complete registration.',
    alertType: 'info',
  },
  emailNotRegistered: {
    showAlert: true,
    alertMessage: 'Email not registered!',
    alertType: 'error',
  },
  wrongLoginCredentials: {
    showAlert: true,
    alertMessage: 'Wrong login credentials',
    alertType: 'error',
  },
  userNotFound: {
    showAlert: true,
    alertMessage: 'User not found, Please sign up!',
    alertType: 'warning',
  },
  emailNotVerified: {
    showAlert: true,
    alertMessage: 'Email is not Verified!',
    alertType: 'error',
  },
  resendVerificationMail: (email) => ({
    showAlert: true,
    alertMessage: `Verification mail sent to ${email}`,
    alertType: 'info',
  }),
  errorSendingEmail: {
    showAlert: true,
    alertMessage: 'Error sending email',
    alertType: 'error',
  },
  bankDetailsRequired: {
    showAlert: true,
    alertMessage: 'Bank Details required',
    alertType: 'error',
  },
  upiIdRequired: {
    showAlert: true,
    alertMessage: 'UPI ID is required.',
    alertType: 'error',
  },
  walletAddressRequired: {
    showAlert: true,
    alertMessage: 'Wallet Address Required',
    alertType: 'error',
  },
  networkSelectRequired: {
    showAlert: true,
    alertMessage: 'Network Selection Required',
    alertType: 'error',
  },
  insufficientBalance: {
    showAlert: true,
    alertMessage: 'Insufficient Balance',
    alertType: 'error',
  },
  errorOccurred: {
    showAlert: true,
    alertMessage: 'Error occurred',
    alertType: 'error',
  },
  registrationDisabled: {
    showAlert: true,
    alertMessage: 'User registrations are currently disabled.',
    alertType: 'error',
  },
  databaseError: {
    showAlert: true,
    alertMessage: 'Database error',
    alertType: 'error',
  },
  invalidToken: {
    showAlert: true,
    alertMessage: 'Expire or Invalid Token',
    alertType: 'error',
  },
  contactAdminError: {
    showAlert: true,
    alertMessage: 'Something went wrong, contact admin!',
    alertType: 'error',
  },
  emailVerified: {
    showAlert: true,
    alertMessage: 'Email verified successfully!',
    alertType: 'success',
  },
  logout: {
    showAlert: true,
    alertMessage: 'Logout successfully!',
    alertType: 'info',
  },
  verifyEmailReminder: {
    showAlert: true,
    alertMessage: 'Verify your email to complete registration.',
    alertType: 'info',
  },
  emailNotRegistered: {
    showAlert: true,
    alertMessage: 'Email not registered!',
    alertType: 'error',
  },
  wrongLoginCredentials: {
    showAlert: true,
    alertMessage: 'Wrong login credentials',
    alertType: 'error',
  },
  emailNotVerified: {
    showAlert: true,
    alertMessage: 'Email is not Verified!',
    alertType: 'error',
  },
  resendVerificationMail: (email) => ({
    showAlert: true,
    alertMessage: `Verification mail sent to ${email}`,
    alertType: 'info',
  }),
  errorSendingEmail: {
    showAlert: true,
    alertMessage: 'Error sending email',
    alertType: 'error',
  }, emailsent: {
    showAlert: true,
    alertMessage: 'Email sent, check your inbox',
    alertType: 'info',
  }, tokenRequired: {
    showAlert: true,
    alertMessage: 'No verification token found',
    alertType: 'error',
  },
  cpIncorrectPassword: {
    showAlert: true,
    alertMessage: 'Current Password not match !',
    alertType: 'error',
  },
  cpNewAndConfirmPassUnmatch: {
    showAlert: true,
    alertMessage: 'New password and confirmation do not match.',
    alertType: 'error',
  },
  cpEmailAlreadySet: {
    showAlert: true,
    alertMessage: 'Email already exists.',
    alertType: 'info',
  },
  cpInformationUpdated: {
    showAlert: true,
    alertMessage: 'Password Updated successfully!',
    alertType: 'success',
  },
  withdrawtimelimit: {
    showAlert: true,
    alertMessage: 'Withdrawals are only allowed between 10:00 AM and 7:30 PM (Monday to Saturday).',
    alertType: 'info',
  }, userAlreadyVerified: {
    showAlert: true,
    alertMessage: 'User Already Verified',
    alertType: 'info',
  },offerUpdatedSuccessfully: {
    showAlert: true,
    alertMessage: 'Offer Updated Successfully',
    alertType: 'success',
  },
};
