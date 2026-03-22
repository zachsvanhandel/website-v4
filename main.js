const MODES = {
  SIMPLE: "simple",
  ADVANCED: "advanced",
};

const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

const COMMANDS = {
  help: {
    usage: "help",
    description: "show a list of available commands",
    modes: [MODES.SIMPLE, MODES.ADVANCED],
    execute: runHelpCommand,
  },
  mode: {
    usage: "mode [simple|advanced]",
    description: "toggle or set the mode",
    modes: [MODES.SIMPLE, MODES.ADVANCED],
    execute: runModeCommand,
  },
  theme: {
    usage: "theme [light|dark]",
    description: "toggle or set the theme",
    modes: [MODES.SIMPLE, MODES.ADVANCED],
    execute: runThemeCommand,
  },
  alias: {
    usage: "alias",
    description: "show a list of available aliases",
    modes: [MODES.ADVANCED],
    execute: runAliasCommand,
  },
  cat: {
    usage: "cat <file>",
    description: "show the contents of a text file",
    modes: [MODES.ADVANCED],
    execute: runCatCommand,
  },
  ls: {
    usage: "ls",
    description: "show a list of available files",
    modes: [MODES.ADVANCED],
    execute: runLsCommand,
  },
  open: {
    usage: "open <file|url>",
    description: "open a file or url in a new browser tab",
    modes: [MODES.ADVANCED],
    execute: runOpenCommand,
  },
};

const ALIASES = {
  about: {
    usage: "about",
    description: "show general info about the website author",
    expansion: ["cat", "about.txt"],
  },
  contact: {
    usage: "contact",
    description: "show contact info for the website author",
    expansion: ["cat", "contact.txt"],
  },
  resume: {
    usage: "resume",
    description: "open the resume.pdf file in a new browser tab",
    expansion: ["open", "resume.pdf"],
  },
  repo: {
    usage: "repo",
    description: "open the source code repository in a new browser tab",
    expansion: ["open", "https://github.com/zachsvanhandel/website-v4"],
  },
};

const FILES = {
  "about.txt": { url: "/assets/about.txt" },
  "contact.txt": { url: "/assets/contact.txt" },
  "resume.pdf": { url: "/assets/resume.pdf" },
};

const HELP_MESSAGE = "Type 'help' to show a list of available commands.";

const commandElement = document.querySelector("#command");
const commandLineElement = document.querySelector("#command-line");
const outputElement = document.querySelector("#output");
const promptElement = document.querySelector("#prompt");
const titleElement = document.querySelector("#title");

let currentMode = MODES.SIMPLE;

let commandHistory = [];
let commandHistoryIndex = -1;
let draftCommand = "";

init();

function init() {
  initTheme();
  initTitle();
  initContent();
}

function initTheme() {
  const setSystemTheme = (mql) =>
    setTheme(mql.matches ? THEMES.LIGHT : THEMES.DARK);

  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", setSystemTheme);

  setSystemTheme(mql);
}

function initTitle() {
  const host = window.location?.host || "localhost";
  const title = `guest@${host}`;

  titleElement.textContent = title;
  document.title = title;
}

function initContent() {
  commandElement.addEventListener("keydown", handleInputKeydown);
  commandLineElement.addEventListener("submit", handleSubmit);
  window.addEventListener("click", () => commandElement.focus());

  appendResponse("Welcome.", "accent");
  appendResponse(HELP_MESSAGE);
}

function handleInputKeydown(event) {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    showPreviousCommand();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    showNextCommand();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    void handleCommand(commandElement.value);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  void handleCommand(commandElement.value);
}

async function handleCommand(value) {
  const command = value.trim();
  appendCommand(command);

  if (!command) {
    appendResponse(HELP_MESSAGE);
    resetInput();
    return;
  }

  recordCommand(command);

  const tokens = tokenizeCommand(command);
  if (tokens.length === 0) {
    resetInput();
    return;
  }

  await executeCommand(tokens);
  resetInput();
}

function recordCommand(command) {
  commandHistory.push(command);
  commandHistoryIndex = commandHistory.length;
  draftCommand = "";
}

function tokenizeCommand(value) {
  const tokens = [];
  let current = "";
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "\\" && index + 1 < value.length) {
      current += value[index + 1];
      index += 1;
      continue;
    }

    if ((character === '"' || character === "'") && !quote) {
      quote = character;
      continue;
    }

    if (character === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(character) && !quote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current || quote) {
    tokens.push(current);
  }

  return tokens;
}

async function executeCommand(tokens) {
  const { command, args, invokedAlias } = resolveCommand(tokens);
  const commandMetadata = COMMANDS[command];

  if (!commandMetadata) {
    appendResponse(`Command not found: ${invokedAlias || command}`, "error");
    appendResponse(HELP_MESSAGE);
    return;
  }

  if (!invokedAlias && !commandMetadata.modes.includes(currentMode)) {
    appendResponse(`Command available in advanced mode: ${command}`);
    appendResponse(`Type "mode advanced" to unlock advanced commands.`);
    return;
  }

  await commandMetadata.execute(args);
}

function resetInput() {
  commandElement.value = "";
  scrollToBottom();
}

function scrollToBottom() {
  outputElement.scrollTop = outputElement.scrollHeight;
}

function resolveCommand(tokens) {
  const [rawCommand, ...args] = tokens;
  const command = rawCommand.toLowerCase();
  const alias = ALIASES[command];

  if (!alias) {
    return { command, args, invokedAlias: null };
  }

  const [resolvedCommand, ...baseArgs] = alias.expansion;
  return {
    command: resolvedCommand,
    args: [...baseArgs, ...args],
    invokedAlias: command,
  };
}

function runHelpCommand() {
  appendResponse(buildHelpText());
}

function runModeCommand([mode]) {
  const nextMode = toggleOrValidate(mode, currentMode, MODES, "mode");

  if (!nextMode) {
    return;
  }

  currentMode = nextMode;
  appendResponse(`Mode switched to ${currentMode}.`, "accent");
  appendResponse(HELP_MESSAGE);
}

function runThemeCommand([theme]) {
  const nextTheme = toggleOrValidate(
    theme,
    document.body.dataset.theme,
    THEMES,
    "theme",
  );

  if (!nextTheme) {
    return;
  }

  setTheme(nextTheme);
  appendResponse(`Theme switched to ${nextTheme}.`, "accent");
}

function runAliasCommand() {
  appendResponse(formatHelpSection(getAliasMetadata("expansion")));
}

async function runCatCommand([filename]) {
  if (!filename) {
    appendResponse("Usage: cat <file>");
    return Promise.resolve();
  }

  const file = getFile(filename);
  if (!file) {
    appendResponse(`File not found: ${filename}`, "error");
    return Promise.resolve();
  }

  if (!isTextFile(filename)) {
    appendResponse(
      `This command only supports text files. Use "open ${filename}" instead.`,
    );
    return Promise.resolve();
  }

  try {
    const data = await loadTextFile(file);
    appendResponse(data);
  } catch {
    appendResponse(
      `Unable to read ${filename}. An unexpected error occurred.`,
      "error",
    );
  }
}

function runLsCommand() {
  const names = Object.keys(FILES).sort();

  appendResponse(names.length > 0 ? names.join("\n") : "No files found.");
}

function runOpenCommand([target]) {
  if (!target) {
    appendResponse("Usage: open <file|url>");
    return;
  }

  if (isUrl(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    appendResponse(`Opened ${target} in a new tab.`, "accent");
    return;
  }

  const file = getFile(target);
  if (!file) {
    appendResponse(`Invalid file name or URL: ${target}`, "error");
    return;
  }

  window.open(file.url, "_blank", "noopener,noreferrer");
  appendResponse(`Opened ${target} in a new tab.`, "accent");
}

function appendCommand(command) {
  const outputEntryElement = document.createElement("div");
  const outputCommandLineElement = document.createElement("div");

  outputEntryElement.className = "entry";
  outputCommandLineElement.className = "command-line";
  outputCommandLineElement.textContent = `${promptElement.textContent} ${command}`;

  outputEntryElement.appendChild(outputCommandLineElement);
  outputElement.appendChild(outputEntryElement);
}

function appendResponse(text, tone = "") {
  const outputEntryElement = document.createElement("div");
  const outputResponseElement = document.createElement("div");

  outputEntryElement.className = "entry";
  outputResponseElement.className = tone ? `response ${tone}` : "response";
  outputResponseElement.textContent = text;

  outputEntryElement.appendChild(outputResponseElement);
  outputElement.appendChild(outputEntryElement);
}

function showPreviousCommand() {
  if (commandHistory.length === 0) {
    return;
  }

  if (commandHistoryIndex === commandHistory.length) {
    draftCommand = commandElement.value;
  }

  commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
  commandElement.value = commandHistory[commandHistoryIndex];
  moveCursorToEnd();
}

function showNextCommand() {
  if (commandHistory.length === 0) {
    return;
  }

  if (commandHistoryIndex >= commandHistory.length - 1) {
    commandHistoryIndex = commandHistory.length;
    commandElement.value = draftCommand;
    moveCursorToEnd();
    return;
  }

  commandHistoryIndex += 1;
  commandElement.value = commandHistory[commandHistoryIndex];
  moveCursorToEnd();
}

function moveCursorToEnd() {
  commandElement.setSelectionRange(
    commandElement.value.length,
    commandElement.value.length,
  );
}

function buildHelpText() {
  const metadata =
    currentMode === MODES.SIMPLE
      ? [
          ...getAliasMetadata("description"),
          ...getCommandMetadata(MODES.SIMPLE),
        ]
      : getCommandMetadata(MODES.ADVANCED);

  return formatHelpSection(metadata);
}

function getAliasMetadata(field) {
  return Object.entries(ALIASES).map(([name, metadata]) => ({
    usage: name,
    description:
      field === "expansion"
        ? metadata.expansion.join(" ")
        : metadata.description,
  }));
}

function getCommandMetadata(allowedMode) {
  return Object.values(COMMANDS)
    .filter((commandMetadata) => commandMetadata.modes.includes(allowedMode))
    .map(({ usage, description }) => ({ usage, description }));
}

function formatHelpSection(metadata) {
  const sortedMetadata = [...metadata].sort((left, right) =>
    left.usage.localeCompare(right.usage),
  );
  const longestUsage = sortedMetadata.reduce(
    (maxLength, metadata) => Math.max(maxLength, metadata.usage.length),
    0,
  );

  return sortedMetadata
    .map(
      (metadata) =>
        `${metadata.usage.padEnd(longestUsage + 2, " ")}${metadata.description}`,
    )
    .join("\n");
}

function toggleOrValidate(value, currentValue, options, commandName) {
  const validValues = Object.values(options);

  if (!value) {
    const currentIndex = Math.max(validValues.indexOf(currentValue), 0);
    const nextIndex = (currentIndex + 1) % validValues.length;
    return validValues[nextIndex];
  }

  if (!validValues.includes(value)) {
    appendResponse(`Usage: ${COMMANDS[commandName].usage}`);
    return null;
  }

  return value;
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
}

function getFile(filename) {
  return FILES[filename] || null;
}

function isTextFile(filename) {
  return filename.toLowerCase().endsWith(".txt");
}

async function loadTextFile(file) {
  const response = await fetch(file.url);

  if (!response.ok) {
    throw new Error(`Failed to load ${file.url}`);
  }

  return response.text();
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}
