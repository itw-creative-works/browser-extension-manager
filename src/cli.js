// Libraries
const path = require('path');
const jetpack = require('fs-jetpack');

// Load .env file from current working directory (project root)
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

// Command Aliases
const DEFAULT = 'setup';
const ALIASES = {
  clean: ['-c', '--clean'],
  install: ['-i', 'i', '--install'],
  setup: ['-s', '--setup'],
  version: ['-v', '--version'],
};

// Function to resolve command name from aliases
function resolveCommand(options) {
  // Check if a command was explicitly passed via positional argument
  if (options._.length > 0) {
    const command = options._[0];
    for (const [key, aliases] of Object.entries(ALIASES)) {
      if (command === key || aliases.includes(command)) {
        return key;
      }
    }
    return command; // If not found in aliases, return as-is
  }

  // Check if any alias was passed as a flag (e.g., -g)
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      if (options[alias.replace(/^-+/, '')]) { // Remove leading `-`
        return key;
      }
    }
  }

  return DEFAULT; // Fallback to default if no match is found
}

// Main Function
function Main() {}

Main.prototype.process = async function (options) {
  // Fix options
  options = options || {};
  options._ = options._ || [];

  // Determine the command (use default if not provided)
  const command = resolveCommand(options);

  try {
    // Get the command file path
    const commandFile = path.join(__dirname, 'commands', `${command}.js`);

    // Check if the command file exists
    if (!jetpack.exists(commandFile)) {
      throw new Error(`Error: Command "${command}" not found.`);
    }

    // Execute the command
    const Command = require(commandFile);
    await Command(options);
  } catch (e) {
    console.error(`Error executing command "${command}": ${e.message}`);

    // Exit with error
    throw e;
  }
};

module.exports = Main;
