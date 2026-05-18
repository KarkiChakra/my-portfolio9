const PRODUCT_KEY = "inventory-products-v2";
const ARRIVAL_KEY = "inventory-arrivals-v2";
const SHIPPING_KEY = "inventory-shipping-v2";
const SESSION_KEY = "inventory-session-v2";
const LAST_EMAIL_KEY = "inventory-last-email-v2";
const ROLE_KEY = "inventory-role-v2";
const LOW_STOCK_LIMIT = 5;

const starterProducts = [
  { name: "ワイヤレスマウス", code: "P-1001", barcode: "4901001001", price: 1800, quantity: 24, arrivalDate: "2026-05-10" },
  { name: "A4コピー用紙", code: "P-2040", barcode: "4902040004", price: 650, quantity: 4, arrivalDate: "2026-05-12" },
  { name: "緑茶パック", code: "P-3302", barcode: "4903302000", price: 420, quantity: 0, arrivalDate: "2026-05-14" }
];

let products = loadProducts();
let arrivals = loadHistory(ARRIVAL_KEY);
let shipping = loadHistory(SHIPPING_KEY);
let activeFilter = "all";
let currentRole = localStorage.getItem(ROLE_KEY) || "admin";

const loginScreen = document.getElementById("loginScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const loginForm = document.getElementById("loginForm");
const productForm = document.getElementById("productForm");
const searchInput = document.getElementById("searchInput");
const barcodeScanner = document.getElementById("barcodeScanner");
const scanButton = document.getElementById("scanButton");
const cameraScanner = document.getElementById("cameraScanner");
const scannerVideo = document.getElementById("scannerVideo");
const scannerStatus = document.getElementById("scannerStatus");
const stopCameraButton = document.getElementById("stopCameraButton");
const sortSelect = document.getElementById("sortSelect");
const tableBody = document.getElementById("inventoryTable");
const emptyState = document.getElementById("emptyState");
const arrivalList = document.getElementById("arrivalList");
const shippingList = document.getElementById("shippingList");
const recentUpdates = document.getElementById("recentUpdates");
const stockHistoryList = document.getElementById("stockHistoryList");
const stockChart = document.getElementById("stockChart");
const lowStockAlert = document.getElementById("lowStockAlert");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const roleInput = document.getElementById("roleInput");
const roleBadge = document.getElementById("roleBadge");
const savedEmailList = document.getElementById("savedEmailList");
const connectionStatus = document.getElementById("connectionStatus");
let inventorySocket = null;
let reconnectTimer = null;
let isApplyingRemoteState = false;
let barcodeDetector = null;
let cameraStream = null;
let scannerFrameId = null;
let isCameraScanning = false;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStarterProducts() {
  return starterProducts.map((product) => ({ ...product, id: createId() }));
}

function ensureStarterInventory() {
  if (products.length === 0 && arrivals.length === 0 && shipping.length === 0) {
    products = createStarterProducts();
  }
}

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_KEY) || "null");
    return Array.isArray(saved) ? normalizeProducts(saved) : createStarterProducts();
  } catch {
    return createStarterProducts();
  }
}

function normalizeProducts(items) {
  return items.map((item) => ({
    id: item.id || createId(),
    name: item.name || "",
    code: item.code || item.sku || "",
    barcode: item.barcode || item.code || item.sku || "",
    price: Number(item.price) || 0,
    quantity: Number(item.quantity ?? item.stock) || 0,
    arrivalDate: item.arrivalDate || todayIso()
  }));
}

function loadHistory(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveState(shouldSync = true) {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  localStorage.setItem(ARRIVAL_KEY, JSON.stringify(arrivals));
  localStorage.setItem(SHIPPING_KEY, JSON.stringify(shipping));
  if (shouldSync) {
    syncStateToServer();
  }
}

function getInventoryState() {
  return {
    products,
    arrivals,
    shipping
  };
}

function applyInventoryState(nextState) {
  if (!nextState || !Array.isArray(nextState.products)) return;
  const remoteIsEmpty = nextState.products.length === 0 &&
    (!Array.isArray(nextState.arrivals) || nextState.arrivals.length === 0) &&
    (!Array.isArray(nextState.shipping) || nextState.shipping.length === 0);

  if (remoteIsEmpty && products.length > 0) {
    syncStateToServer();
    return;
  }

  if (nextState.products.length < products.length) {
    syncStateToServer();
    return;
  }

  isApplyingRemoteState = true;
  products = normalizeProducts(nextState.products);
  arrivals = Array.isArray(nextState.arrivals) ? nextState.arrivals : [];
  shipping = Array.isArray(nextState.shipping) ? nextState.shipping : [];
  saveState(false);
  isApplyingRemoteState = false;
  render();
}

function sendSocketMessage(message) {
  if (!inventorySocket || inventorySocket.readyState !== WebSocket.OPEN) return;
  inventorySocket.send(JSON.stringify(message));
}

function canUseInventoryServer() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

async function syncStateToServer() {
  if (isApplyingRemoteState) return;
  if (!canUseInventoryServer()) return;

  try {
    await fetch("/api/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        state: getInventoryState()
      })
    });
  } catch {
    // The app still works locally when the realtime server is not running.
  }
}

async function refreshInventoryFromServer() {
  if (!canUseInventoryServer()) return;

  try {
    const response = await fetch("/api/inventory");
    if (!response.ok) return;
    const data = await response.json();
    if (data.state) {
      applyInventoryState(data.state);
    }
  } catch {
    // Keep the current local inventory if the server cannot be reached.
  }
}

function setConnectionStatus(isOnline) {
  connectionStatus.textContent = isOnline ? "リアルタイム接続中" : "リアルタイム未接続";
  connectionStatus.classList.toggle("online", isOnline);
  connectionStatus.classList.toggle("offline", !isOnline);
}

function connectInventorySocket() {
  if (!("WebSocket" in window)) return;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || "localhost:4182";
  inventorySocket = new WebSocket(`${protocol}//${host}/ws`);

  inventorySocket.addEventListener("open", () => {
    setConnectionStatus(true);
    sendSocketMessage({
      type: "hello",
      state: getInventoryState()
    });
  });

  inventorySocket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "state:sync") {
        applyInventoryState(message.state);
      }
      if (message.type === "inventory:refresh") {
        refreshInventoryFromServer();
      }
    } catch {
      // Ignore malformed realtime messages.
    }
  });

  inventorySocket.addEventListener("close", () => {
    setConnectionStatus(false);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectInventorySocket, 1800);
  });

  inventorySocket.addEventListener("error", () => {
    setConnectionStatus(false);
  });
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function nowLabel() {
  return new Date().toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function isLowStock(product) {
  return product.quantity < LOW_STOCK_LIMIT;
}

function productStatus(product) {
  if (product.quantity <= 0) return { label: "在庫切れ", className: "status-out" };
  if (isLowStock(product)) return { label: "在庫不足", className: "status-low" };
  return { label: "在庫あり", className: "status-ok" };
}

function sortProducts(items) {
  const compareText = (a, b, key) => String(a[key] || "").localeCompare(String(b[key] || ""));
  const compareNumber = (a, b, key) => (Number(a[key]) || 0) - (Number(b[key]) || 0);
  const compareDate = (a, b) => String(a.arrivalDate || "").localeCompare(String(b.arrivalDate || ""));

  const sorters = {
    "name-asc": (a, b) => compareText(a, b, "name"),
    "name-desc": (a, b) => compareText(b, a, "name"),
    "quantity-asc": (a, b) => compareNumber(a, b, "quantity"),
    "quantity-desc": (a, b) => compareNumber(b, a, "quantity"),
    "price-asc": (a, b) => compareNumber(a, b, "price"),
    "price-desc": (a, b) => compareNumber(b, a, "price"),
    "arrivalDate-asc": compareDate,
    "arrivalDate-desc": (a, b) => compareDate(b, a)
  };

  const sorter = sorters[sortSelect.value] || sorters["name-asc"];
  return [...items].sort(sorter);
}

function filteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const rows = products.filter((product) => {
    const matchesSearch = [product.name, product.code, product.barcode]
      .join(" ")
      .toLowerCase()
      .includes(query);

    if (!matchesSearch) return false;
    if (activeFilter === "low") return isLowStock(product);
    if (activeFilter === "out") return product.quantity <= 0;
    return true;
  });

  return sortProducts(rows);
}

function renderSummary() {
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStockProducts = products.filter(isLowStock).length;
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0);

  document.getElementById("totalProducts").textContent = totalProducts;
  document.getElementById("totalStock").textContent = totalStock;
  document.getElementById("lowStock").textContent = lowStockProducts;
  document.getElementById("stockValue").textContent = yen(stockValue);
  lowStockAlert.hidden = lowStockProducts === 0;
}

function renderTable() {
  const rows = filteredProducts();
  tableBody.innerHTML = "";
  emptyState.hidden = rows.length !== 0;

  rows.forEach((product) => {
    const status = productStatus(product);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="product-name">${escapeHtml(product.name)}</div></td>
      <td>${escapeHtml(product.code)}</td>
      <td>${escapeHtml(product.barcode || "-")}</td>
      <td>${yen(product.price)}</td>
      <td>${escapeHtml(formatDate(product.arrivalDate))}</td>
      <td><strong>${product.quantity}</strong></td>
      <td><span class="status-pill ${status.className}">${status.label}</span></td>
      <td></td>
    `;

    const template = document.getElementById("stockActionTemplate");
    const actions = template.content.cloneNode(true);
    actions.querySelector(".stock-in").addEventListener("click", () => updateQuantity(product.id, 1));
    actions.querySelector(".stock-out").addEventListener("click", () => updateQuantity(product.id, -1));
    actions.querySelector(".remove").addEventListener("click", () => deleteProduct(product.id));
    actions.querySelector(".stock-in").disabled = currentRole === "viewer";
    actions.querySelector(".stock-out").disabled = currentRole === "viewer";
    actions.querySelector(".remove").disabled = currentRole !== "admin";
    tr.lastElementChild.appendChild(actions);
    tableBody.appendChild(tr);
  });
}

function renderHistoryList(list, items, emptyText) {
  list.innerHTML = "";
  const recent = items.slice(0, 6);

  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    list.appendChild(li);
    return;
  }

  recent.forEach((item) => {
    const li = document.createElement("li");
    const arrivalDate = item.arrivalDate ? `入荷日: ${formatDate(item.arrivalDate)} - ` : "";
    li.innerHTML = `
      <strong>${escapeHtml(item.productName)} (${escapeHtml(item.productCode)})</strong>
      <span>${arrivalDate}${item.quantity} item${item.quantity === 1 ? "" : "s"} - ${escapeHtml(item.time)}</span>
    `;
    list.appendChild(li);
  });
}

function renderRecentUpdates() {
  const updates = [
    ...arrivals.map((item) => ({ ...item, type: "入荷" })),
    ...shipping.map((item) => ({ ...item, type: "出荷" }))
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  recentUpdates.innerHTML = "";
  if (updates.length === 0) {
    const li = document.createElement("li");
    li.textContent = "最近の更新はありません。";
    recentUpdates.appendChild(li);
    return;
  }

  updates.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.type}: ${escapeHtml(item.productName)}</strong>
      <span>${item.quantity} item${item.quantity === 1 ? "" : "s"} - ${escapeHtml(item.time)}</span>
    `;
    recentUpdates.appendChild(li);
  });
}

function renderStockHistory() {
  const updates = [
    ...arrivals.map((item) => ({ ...item, type: "入荷" })),
    ...shipping.map((item) => ({ ...item, type: "出荷" }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  stockHistoryList.innerHTML = "";
  if (updates.length === 0) {
    const li = document.createElement("li");
    li.textContent = "在庫履歴はありません。";
    stockHistoryList.appendChild(li);
    return;
  }

  updates.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.type}: ${escapeHtml(item.productName)} (${escapeHtml(item.productCode)})</strong>
      <span>${item.quantity} item${item.quantity === 1 ? "" : "s"} - ${escapeHtml(item.time)}</span>
    `;
    stockHistoryList.appendChild(li);
  });
}

function renderStockChart() {
  const context = stockChart.getContext("2d");
  const width = stockChart.width;
  const height = stockChart.height;
  const chartProducts = [...products]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);
  const maxQuantity = Math.max(1, ...chartProducts.map((product) => product.quantity));

  context.clearRect(0, 0, width, height);
  context.fillStyle = getComputedStyle(document.body).getPropertyValue("--surface-2").trim();
  context.fillRect(0, 0, width, height);

  context.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted").trim();
  context.font = "13px Arial";
  context.fillText("在庫数が多い商品", 18, 24);

  const left = 42;
  const bottom = height - 42;
  const chartHeight = height - 78;
  const barGap = 18;
  const barWidth = chartProducts.length ? (width - left - 28 - barGap * (chartProducts.length - 1)) / chartProducts.length : 0;

  chartProducts.forEach((product, index) => {
    const barHeight = Math.round((product.quantity / maxQuantity) * chartHeight);
    const x = left + index * (barWidth + barGap);
    const y = bottom - barHeight;
    context.fillStyle = product.quantity < LOW_STOCK_LIMIT ? "#f97316" : "#0f766e";
    context.fillRect(x, y, barWidth, barHeight);
    context.fillStyle = getComputedStyle(document.body).getPropertyValue("--text").trim();
    context.fillText(String(product.quantity), x + 4, y - 6);
    context.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted").trim();
    context.fillText(product.code, x, bottom + 22);
  });
}

function render() {
  renderSummary();
  renderTable();
  renderHistoryList(arrivalList, arrivals, "入荷履歴はありません。");
  renderHistoryList(shippingList, shipping, "出荷履歴はありません。");
  renderRecentUpdates();
  renderStockHistory();
  renderStockChart();
  applyRolePermissions();
}

function setActiveFilter(nextFilter) {
  activeFilter = nextFilter;
  document.querySelectorAll(".segmented").forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === activeFilter);
  });
}

function addHistory(collection, product, quantity) {
  collection.unshift({
    id: createId(),
    productName: product.name,
    productCode: product.code,
    arrivalDate: product.arrivalDate,
    quantity,
    time: nowLabel(),
    timestamp: Date.now()
  });
  return collection.slice(0, 30);
}

function updateQuantity(id, amount) {
  if (currentRole === "viewer") {
    alert("閲覧のみの権限では在庫を更新できません。");
    return;
  }

  const product = products.find((item) => item.id === id);
  if (!product) return;
  if (amount < 0 && product.quantity <= 0) {
    alert("この商品はすでに在庫切れです。");
    return;
  }

  product.quantity += amount;
  if (amount > 0) {
    arrivals = addHistory(arrivals, product, amount);
  } else {
    shipping = addHistory(shipping, product, Math.abs(amount));
  }

  saveState();
  render();
}

function deleteProduct(id) {
  if (currentRole !== "admin") {
    alert("商品を削除できるのは管理者のみです。");
    return;
  }

  products = products.filter((item) => item.id !== id);
  saveState();
  render();
}

function showDashboard() {
  loginScreen.hidden = true;
  dashboardScreen.hidden = false;
  roleBadge.textContent = `権限: ${roleLabel(currentRole)}`;
  applyRolePermissions();
}

function roleLabel(role) {
  return {
    admin: "管理者",
    staff: "スタッフ",
    viewer: "閲覧のみ"
  }[role] || "管理者";
}

function showLogin() {
  loginScreen.hidden = false;
  dashboardScreen.hidden = true;
  passwordInput.value = "";
  emailInput.value = "";
  const lastEmail = localStorage.getItem(LAST_EMAIL_KEY) || "";
  savedEmailList.innerHTML = "";
  if (lastEmail) {
    const option = document.createElement("option");
    option.value = lastEmail;
    savedEmailList.appendChild(option);
    emailInput.placeholder = lastEmail;
  } else {
    emailInput.placeholder = "メールアドレスを入力";
  }
  roleInput.value = currentRole;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください。");
    return;
  }

  currentRole = roleInput.value;
  localStorage.setItem(SESSION_KEY, "logged-in");
  localStorage.setItem(LAST_EMAIL_KEY, email);
  localStorage.setItem(ROLE_KEY, currentRole);
  showDashboard();
  render();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (currentRole === "viewer") {
    alert("閲覧のみの権限では商品を登録できません。");
    return;
  }

  const name = document.getElementById("productName").value.trim();
  const code = document.getElementById("productCode").value.trim().toUpperCase();
  const barcode = document.getElementById("productBarcode").value.trim();
  const duplicateCode = products.some((product) => product.code.toLowerCase() === code.toLowerCase());
  const duplicateBarcode = barcode && products.some((product) => product.barcode.toLowerCase() === barcode.toLowerCase());

  if (!name || !code || duplicateCode || duplicateBarcode) {
    alert(duplicateCode || duplicateBarcode ? "この商品番号またはバーコードはすでに登録されています。" : "商品名と商品番号を入力してください。");
    return;
  }

  const product = {
    id: createId(),
    name,
    code,
    barcode,
    price: Number(document.getElementById("productPrice").value) || 0,
    quantity: Number(document.getElementById("productQuantity").value) || 0,
    arrivalDate: document.getElementById("arrivalDate").value || todayIso()
  };

  products.unshift(product);
  arrivals = addHistory(arrivals, product, product.quantity);
  saveState();
  productForm.reset();
  document.getElementById("productPrice").value = 1000;
  document.getElementById("productQuantity").value = 10;
  document.getElementById("arrivalDate").value = todayIso();
  render();
});

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() && activeFilter !== "all") {
    setActiveFilter("all");
  }
  renderTable();
});
sortSelect.addEventListener("change", renderTable);

function searchByBarcode() {
  const value = barcodeScanner.value.trim();
  if (!value) {
    barcodeScanner.focus();
    return;
  }

  searchInput.value = value;
  setActiveFilter("all");
  renderTable();
}

function setScannerStatus(message) {
  scannerStatus.textContent = message;
}

function stopCameraScanner() {
  isCameraScanning = false;
  cameraScanner.hidden = true;
  scanButton.textContent = "カメラ";
  if (scannerFrameId) {
    cancelAnimationFrame(scannerFrameId);
    scannerFrameId = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  scannerVideo.srcObject = null;
}

function applyScannedBarcode(value) {
  barcodeScanner.value = value;
  searchByBarcode();
  setScannerStatus(`読み取り完了: ${value}`);
  stopCameraScanner();
}

async function scanCameraFrame() {
  if (!isCameraScanning || !barcodeDetector) return;

  try {
    const barcodes = await barcodeDetector.detect(scannerVideo);
    if (barcodes.length > 0) {
      applyScannedBarcode(barcodes[0].rawValue);
      return;
    }
    setScannerStatus("読み取り中...");
  } catch {
    setScannerStatus("カメラ読み取りを一時停止しました。もう一度お試しください。");
  }

  scannerFrameId = requestAnimationFrame(scanCameraFrame);
}

async function startCameraScanner() {
  if (!("BarcodeDetector" in window)) {
    alert("このブラウザはカメラでのバーコード読み取りに対応していません。USBバーコードスキャナーまたは手入力を使用してください。");
    barcodeScanner.focus();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("このブラウザではカメラを使用できません。");
    return;
  }

  try {
    barcodeDetector = barcodeDetector || new BarcodeDetector({
      formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"]
    });
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      },
      audio: false
    });
    scannerVideo.srcObject = cameraStream;
    cameraScanner.hidden = false;
    scanButton.textContent = "読取中";
    isCameraScanning = true;
    setScannerStatus("バーコードをカメラに向けてください。");
    await scannerVideo.play();
    scanCameraFrame();
  } catch {
    stopCameraScanner();
    alert("カメラを開けませんでした。カメラの許可を確認するか、バーコードを入力してください。");
  }
}

scanButton.addEventListener("click", () => {
  if (isCameraScanning) {
    stopCameraScanner();
    return;
  }
  barcodeScanner.focus();
  if (barcodeScanner.value.trim()) {
    searchByBarcode();
    return;
  }
  startCameraScanner();
});

stopCameraButton.addEventListener("click", stopCameraScanner);

barcodeScanner.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchByBarcode();
  }
});

document.querySelectorAll(".segmented").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
    if (button.dataset.filter === "all") {
      searchInput.value = "";
      barcodeScanner.value = "";
    }
    renderTable();
  });
});

document.getElementById("clearData").addEventListener("click", () => {
  if (currentRole !== "admin") {
    alert("デモデータをリセットできるのは管理者のみです。");
    return;
  }

  products = createStarterProducts();
  arrivals = [];
  shipping = [];
  saveState();
  render();
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("inventory-theme", document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem("inventory-theme") === "dark") {
  document.body.classList.add("dark");
}

function applyRolePermissions() {
  const isViewer = currentRole === "viewer";
  const isAdmin = currentRole === "admin";
  productForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = isViewer;
  });
  document.getElementById("clearData").disabled = !isAdmin;
}

document.getElementById("arrivalDate").value = todayIso();
ensureStarterInventory();
saveState(false);
if (localStorage.getItem(SESSION_KEY) === "logged-in") {
  showDashboard();
  render();
} else {
  showLogin();
}
connectInventorySocket();
