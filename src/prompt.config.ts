export const schema = [
  {
    name: "username",
    required: true,
    message: "Your email address used to sign in to Jira",
    description: "Enter your email",
  },
  {
    name: "apiKey",
    description: "Enter your personal api key",
    message:
      "Your personal API key, create one in profile settings if you haven't already",
    required: true,
  },
];

//   {
//     description: 'Enter your password',     // Prompt displayed to the user. If not supplied name will be used.
//     type: 'string',                 // Specify the type of input to expect.
//     pattern: /^\w+$/,                  // Regular expression that input must be valid against.
//     message: 'Password must be letters', // Warning message to display if validation fails.
//     hidden: true,                        // If true, characters entered will either not be output to console or will be outputed using the `replace` string.
//     replace: '*',                        // If `hidden` is set it will replace each hidden character with the specified string.
//     default: 'lamepassword',             // Default value to use if no value is entered.
//     required: true                        // If true, value entered must be non-empty.
//     before: function(value) { return 'v' + value; } // Runs before node-prompt callbacks. It modifies user's input
//   }
