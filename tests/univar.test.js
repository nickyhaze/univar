const path = require("path");
const child_process = require("child_process");

// Import the module under test. Update the path if your file lives elsewhere.
const { normalizeArguments, runCommand } = require(path.resolve(__dirname, "../src/univar"));

// Keep originals so we can restore them after tests
const ORIGINAL_ENV = { ...process.env };

describe("normalizeArguments", () => {
  beforeEach(() => {
    // Reset to a controlled environment for each test
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("returns empty array for non-array input", () => {
    expect(normalizeArguments(undefined)).toEqual([]);
    expect(normalizeArguments(null)).toEqual([]);
    expect(normalizeArguments("echo hi")).toEqual([]);
    expect(normalizeArguments(123)).toEqual([]);
  });

  test("replaces $VAR syntax from env", () => {
    process.env = { ...process.env, FOO: "world" };
    const out = normalizeArguments(["echo", "hello", "$FOO"]);
    expect(out).toEqual(["echo", "hello", "world"]);
  });

  test("replaces %VAR% (Windows style) from env", () => {
    process.env = { ...process.env, USERNAME: "Jane Doe" };
    const out = normalizeArguments(["echo", "%USERNAME%"]);
    expect(out).toEqual(["echo", "Jane Doe"]);
  });

  test("does not partially replace when keys overlap (longest first)", () => {
    // Overlapping keys: AB and ABC
    process.env = { ...process.env, AB: "__AB__", ABC: "__ABC__" };
    const out = normalizeArguments(["$ABC", "$AB", "x$ABCy", "%ABC%", "%AB%", "x%ABC%y"]);
    expect(out).toEqual(["__ABC__", "__AB__", "x__ABC__y", "__ABC__", "__AB__", "x__ABC__y"]);
  });

  test("leaves unknown variables unchanged (let the shell decide)", () => {
    const out = normalizeArguments(["echo", "$DOES_NOT_EXIST", "%ALSO_NOT%"]);
    expect(out).toEqual(["echo", "$DOES_NOT_EXIST", "%ALSO_NOT%"]);
  });
});

describe("runCommand", () => {
  let exitSpy;
  let errorSpy;
  let execSpy;

  beforeEach(() => {
    // Reset env
    process.env = { ...ORIGINAL_ENV };

    // Mock process.exit so tests don't actually exit the runner
    exitSpy = jest.spyOn(process, "exit").mockImplementation((/** @type {number} */ _code) => {
      throw new Error(`process.exit: ${_code}`);
    });

    // Mock console.error to observe messages
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Mock execSync by default to do nothing (success)
    execSpy = jest.spyOn(child_process, "execSync").mockImplementation(() => Buffer.from(""));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("prints usage and exits(1) when no args provided", () => {
    try {
      runCommand([]);
    } catch (e) {
      // swallow the thrown error from mocked process.exit
    }
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toMatch(/Usage: univar/);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(execSpy).not.toHaveBeenCalled();
  });

  test("runs the command and exits(0) on success", () => {
    try {
      runCommand(["echo", "hi"]);
    } catch (e) {
      // swallow mocked exit
    }

    expect(execSpy).toHaveBeenCalledTimes(1);
    const [command, options] = execSpy.mock.calls[0];
    expect(command).toBe("echo hi");
    expect(options).toEqual(
        expect.objectContaining({
          stdio: "inherit",
          env: process.env,
          windowsHide: false,
          shell: true,
        })
    );

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("substitutes env placeholders before execution", () => {
    process.env = { ...process.env, NAME: "Jane Doe" };
    try {
      runCommand(["echo", "$NAME"]);
    } catch (e) {}

    const [command] = execSpy.mock.calls[0];
    expect(command).toBe("echo Jane Doe");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("propagates numeric exit status from child process", () => {
    execSpy.mockImplementation(() => {
      const err = new Error("boom");
      // @ts-ignore add status like child_process errors do
      err.status = 7;
      throw err;
    });

    try {
      runCommand(["some", "cmd"]);
    } catch (e) {}

    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(7);
  });

  test("prints error message and exits(1) when no numeric status is present", () => {
    execSpy.mockImplementation(() => {
      throw new Error("unexpected failure");
    });

    try {
      runCommand(["some", "cmd"]);
    } catch (e) {}

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch(/unexpected failure/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
