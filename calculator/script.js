const display = document.getElementById("display");
const historyList = document.getElementById("history-list");
const historyClearButton = document.querySelector(".history-clear");
const angleToggleButton = document.querySelector(".angle-toggle");

let historyItems = [];
let clickAudioContext = null;
let clickAudioLastTime = 0;
let angleMode = "DEG";
let lastAnswer = "0";

function getPreferredTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const toggleButton = document.querySelector(".theme-toggle");
  if (toggleButton) {
    toggleButton.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
}

applyTheme(getPreferredTheme());

const themeToggleButton = document.querySelector(".theme-toggle");
if (themeToggleButton) {
  themeToggleButton.addEventListener("click", toggleTheme);
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("calc_history") || "[]");
    if (!Array.isArray(saved)) {
      historyItems = [];
      return;
    }
    historyItems = saved
      .filter(
        (item) =>
          item &&
          typeof item.expression === "string" &&
          typeof item.result === "string"
      )
      .slice(-25);
  } catch {
    historyItems = [];
  }
}

function saveHistory() {
  localStorage.setItem("calc_history", JSON.stringify(historyItems.slice(-25)));
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";

  for (let i = historyItems.length - 1; i >= 0; i -= 1) {
    const item = historyItems[i];
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.dataset.result = item.result;

    const expressionSpan = document.createElement("span");
    expressionSpan.className = "history-expression";
    expressionSpan.textContent = item.expression;

    const resultSpan = document.createElement("span");
    resultSpan.className = "history-result";
    resultSpan.textContent = `= ${item.result}`;

    button.append(expressionSpan, resultSpan);
    li.append(button);
    historyList.append(li);
  }
}

function addToHistory(expression, result) {
  if (!expression || !result) {
    return;
  }

  const normalizedExpression = String(expression).trim();
  const normalizedResult = String(result).trim();
  if (!normalizedExpression || !normalizedResult) {
    return;
  }

  historyItems.push({
    expression: normalizedExpression,
    result: normalizedResult,
  });

  historyItems = historyItems.slice(-25);
  saveHistory();
  renderHistory();
}

loadHistory();
renderHistory();

if (historyList) {
  historyList.addEventListener("click", (event) => {
    const button = event.target.closest(".history-item");
    if (!button) {
      return;
    }
    const result = button.dataset.result;
    if (typeof result === "string" && result.length > 0) {
      display.value = result;
    }
  });
}

if (historyClearButton) {
  historyClearButton.addEventListener("click", () => {
    historyItems = [];
    saveHistory();
    renderHistory();
  });
}

function loadAngleMode() {
  const saved = localStorage.getItem("calc_angle_mode");
  if (saved === "RAD" || saved === "DEG") {
    angleMode = saved;
  } else {
    angleMode = "DEG";
  }
}

function saveAngleMode() {
  localStorage.setItem("calc_angle_mode", angleMode);
}

function renderAngleMode() {
  if (!angleToggleButton) {
    return;
  }
  angleToggleButton.textContent = angleMode;
}

function toggleAngleMode() {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  saveAngleMode();
  renderAngleMode();
}

loadAngleMode();
renderAngleMode();

if (angleToggleButton) {
  angleToggleButton.addEventListener("click", toggleAngleMode);
}

function playClickSound() {
  const now = performance.now();
  if (now - clickAudioLastTime < 25) {
    return;
  }
  clickAudioLastTime = now;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!clickAudioContext) {
      clickAudioContext = new AudioContextClass();
    }

    if (clickAudioContext.state === "suspended") {
      clickAudioContext.resume().catch(() => {});
    }

    const oscillator = clickAudioContext.createOscillator();
    const gain = clickAudioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 880;

    const startAt = clickAudioContext.currentTime;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.035);

    oscillator.connect(gain);
    gain.connect(clickAudioContext.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + 0.04);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {}
}

const calculatorRoot = document.querySelector(".calculator");
if (calculatorRoot) {
  calculatorRoot.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    playClickSound();
  });
}

function appendValue(value) {
  if (display.value === "Error") {
    display.value = "";
  }
  display.value += value;
}

function appendFunction(name) {
  if (display.value === "Error") {
    display.value = "";
  }
  display.value += `${name}(`;
}

function appendConstant(name) {
  if (display.value === "Error") {
    display.value = "";
  }
  if (name === "pi") {
    display.value += "pi";
    return;
  }
  if (name === "e") {
    display.value += "e";
    return;
  }
  if (name === "ans") {
    display.value += "ans";
  }
}

function clearDisplay() {
  display.value = "";
}

function deleteLast() {
  display.value = display.value.slice(0, -1);
}

function factorial(n) {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw new Error("Invalid factorial");
  }
  if (n > 170) {
    return Infinity;
  }
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

function tokenize(expression) {
  const tokens = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        num += expression[i];
        i += 1;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = ch;
      i += 1;
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        ident += expression[i];
        i += 1;
      }
      tokens.push({ type: "ident", value: ident });
      continue;
    }
    if (ch === "π") {
      tokens.push({ type: "ident", value: "pi" });
      i += 1;
      continue;
    }
    if ("+-*/^()%!".includes(ch) || ch === "(" || ch === ")") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: "," });
      i += 1;
      continue;
    }
    throw new Error("Unexpected character");
  }
  return tokens;
}

function normalizeExpression(expression) {
  return String(expression)
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("π", "pi");
}

function isFunctionName(name) {
  const n = String(name).toLowerCase();
  return (
    n === "sin" ||
    n === "cos" ||
    n === "tan" ||
    n === "asin" ||
    n === "acos" ||
    n === "atan" ||
    n === "sqrt" ||
    n === "ln" ||
    n === "log" ||
    n === "abs" ||
    n === "exp"
  );
}

function insertImplicitMultiplication(tokens) {
  const result = [];

  const isValueEnd = (tok) => {
    if (!tok) {
      return false;
    }
    if (tok.type === "number" || tok.type === "ident") {
      return true;
    }
    if (tok.type === "op" && (tok.value === ")" || tok.value === "!" || tok.value === "%")) {
      return true;
    }
    return false;
  };

  const isValueStart = (tok) => {
    if (!tok) {
      return false;
    }
    if (tok.type === "number" || tok.type === "ident") {
      return true;
    }
    if (tok.type === "op" && tok.value === "(") {
      return true;
    }
    return false;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const prev = result[result.length - 1];

    if (
      isValueEnd(prev) &&
      isValueStart(current) &&
      !(prev && prev.type === "ident" && current.type === "op" && current.value === "(" && isFunctionName(prev.value))
    ) {
      result.push({ type: "op", value: "*" });
    }

    result.push(current);
  }

  return result;
}

function parseExpressionTokens(tokens) {
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(expectedType, expectedValue) {
    const tok = tokens[index];
    if (!tok) {
      throw new Error("Unexpected end");
    }
    if (expectedType && tok.type !== expectedType) {
      throw new Error("Unexpected token");
    }
    if (expectedValue && tok.value !== expectedValue) {
      throw new Error("Unexpected token");
    }
    index += 1;
    return tok;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) {
      throw new Error("Unexpected end");
    }

    if (tok.type === "number") {
      consume("number");
      const n = Number(tok.value);
      if (!Number.isFinite(n)) {
        throw new Error("Invalid number");
      }
      return n;
    }

    if (tok.type === "ident") {
      consume("ident");
      const name = tok.value.toLowerCase();

      if (peek() && peek().type === "op" && peek().value === "(") {
        consume("op", "(");
        const arg = parseAddSub();
        consume("op", ")");
        return applyFunction(name, arg);
      }

      if (name === "pi") {
        return Math.PI;
      }
      if (name === "e") {
        return Math.E;
      }
      if (name === "ans") {
        const n = Number(lastAnswer);
        if (!Number.isFinite(n)) {
          throw new Error("Invalid ANS");
        }
        return n;
      }
      throw new Error("Unknown identifier");
    }

    if (tok.type === "op" && tok.value === "(") {
      consume("op", "(");
      const value = parseAddSub();
      consume("op", ")");
      return value;
    }

    if (tok.type === "op" && (tok.value === "+" || tok.value === "-")) {
      consume("op");
      const right = parsePrimary();
      return tok.value === "-" ? -right : right;
    }

    throw new Error("Unexpected token");
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() && peek().type === "op" && (peek().value === "!" || peek().value === "%")) {
      const op = consume("op").value;
      if (op === "!") {
        value = factorial(value);
      } else {
        value /= 100;
      }
    }
    return value;
  }

  function parsePower() {
    let left = parsePostfix();
    if (peek() && peek().type === "op" && peek().value === "^") {
      consume("op", "^");
      const right = parsePower();
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseMulDiv() {
    let value = parsePower();
    while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = consume("op").value;
      const right = parsePower();
      if (op === "*") {
        value *= right;
      } else {
        value /= right;
      }
    }
    return value;
  }

  function parseAddSub() {
    let value = parseMulDiv();
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = consume("op").value;
      const right = parseMulDiv();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseAddSub();
  if (index !== tokens.length) {
    throw new Error("Unexpected input");
  }
  return result;
}

function applyFunction(name, x) {
  function toRadians(deg) {
    return deg * (Math.PI / 180);
  }

  function toDegrees(rad) {
    return rad * (180 / Math.PI);
  }

  function sin(value) {
    return angleMode === "DEG" ? Math.sin(toRadians(value)) : Math.sin(value);
  }

  function cos(value) {
    return angleMode === "DEG" ? Math.cos(toRadians(value)) : Math.cos(value);
  }

  function tan(value) {
    return angleMode === "DEG" ? Math.tan(toRadians(value)) : Math.tan(value);
  }

  if (name === "sin") {
    return sin(x);
  }
  if (name === "cos") {
    return cos(x);
  }
  if (name === "tan") {
    return tan(x);
  }
  if (name === "asin") {
    const r = Math.asin(x);
    return angleMode === "DEG" ? toDegrees(r) : r;
  }
  if (name === "acos") {
    const r = Math.acos(x);
    return angleMode === "DEG" ? toDegrees(r) : r;
  }
  if (name === "atan") {
    const r = Math.atan(x);
    return angleMode === "DEG" ? toDegrees(r) : r;
  }
  if (name === "sqrt") {
    return Math.sqrt(x);
  }
  if (name === "ln") {
    return Math.log(x);
  }
  if (name === "log") {
    return Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10;
  }
  if (name === "abs") {
    return Math.abs(x);
  }
  if (name === "exp") {
    return Math.exp(x);
  }
  throw new Error("Unknown function");
}

function evaluateScientific(expression) {
  const normalized = normalizeExpression(expression);
  const tokens = insertImplicitMultiplication(tokenize(normalized));
  return parseExpressionTokens(tokens);
}

function calculate() {
  const expression = display.value;
  console.log("INPUT:", expression);
  if (!expression || expression === "Error") {
    return;
  }
  try {
    const result = evaluateScientific(expression);
    const resultText = String(result);
    display.value = resultText;
    lastAnswer = resultText;
    addToHistory(expression, resultText);
  } catch {
    display.value = "Error";
  }
}

function handleKeyboardInput(event) {
  const activeElement = document.activeElement;
  if (
    activeElement &&
    activeElement !== display &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable)
  ) {
    return;
  }

  const key = event.key;

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculate();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    deleteLast();
    return;
  }

  if (key === "Escape" || key.toLowerCase() === "c") {
    event.preventDefault();
    clearDisplay();
    return;
  }

  if (key === "Delete") {
    event.preventDefault();
    clearDisplay();
    return;
  }

  if (key === "x" || key === "X") {
    event.preventDefault();
    appendValue("*");
    return;
  }

  const allowedSingleChar = /^[0-9+\-*/().^%! ]$/;
  if (allowedSingleChar.test(key) && key !== " ") {
    event.preventDefault();
    appendValue(key);
    return;
  }

  // ❌ Block manual typing of functions
  if (/^[a-z]$/i.test(key)) {
    event.preventDefault();
    return;
  }
}

document.addEventListener("keydown", handleKeyboardInput);
