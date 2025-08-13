const child_process = require("child_process");

/**
 * Replaces environment variable placeholders in command arguments.
 * Supports both `$VAR` and `%VAR%` syntax.
 * @param {string[]} args - Array of command arguments.
 * @returns {string[]} - Array of arguments with environment variables substituted.
 */
function normalizeArguments(args) {
  if (!Array.isArray(args)) return [];

  // Sort env keys by length (longest first) to avoid partial matches.
  const envKeys = Object.keys(process.env).sort((a, b) => b.length - a.length);

  return args.map((arg) => {
    let result = String(arg);
    envKeys.forEach((key) => {
      const value = process.env[key] || "";
      // Replace both `$KEY` and `%KEY%` placeholders with their values.
      result = result.replace(new RegExp(`\\$${key}`, "g"), value);
      result = result.replace(new RegExp(`%${key}%`, "g"), value);
    });
    return result;
  });
}

/**
 * Executes a shell command with the given arguments.
 * @param {string[]} rawArgs - Raw command arguments, possibly containing env placeholders.
 */
function runCommand(rawArgs) {
  if (!rawArgs || rawArgs.length === 0) {
    console.error("Usage: univar <command> [args...]");
    process.exit(1);
  }

  const args = normalizeArguments(rawArgs);
  const command = args.join(" ");

  try {
    child_process.execSync(command, {
      stdio: "inherit",
      env: process.env,
      windowsHide: false,
      shell: true,
    });
  } catch (err) {
    if (typeof err.status === "number") {
      process.exit(err.status);
    } else {
      console.error(err.message || String(err));
      process.exit(1);
    }
    return;
  }

  // Keep exit outside the try/catch so the jest spy's throw isn't swallowed.
  process.exit(0);
}

module.exports = { normalizeArguments, runCommand };
