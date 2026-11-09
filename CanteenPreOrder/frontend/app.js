const API_BASE = "http://localhost:8080/api";

// Maintain separate active tokens per role
let currentRole = localStorage.getItem("last_active_role") || "student";
let allMenuItems = [];
let cart = {}; 
let statusPollingInterval = null;

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  fetchMenu();
  switchView(currentRole);
});

// Switch Views between Student, Faculty, and Staff
function switchView(role) {
  currentRole = role;
  localStorage.setItem("last_active_role", role);

  // Toggle active class on navigation buttons
  document.getElementById("btnRoleStudent").classList.toggle("active", role === 'student');
  document.getElementById("btnRoleFaculty").classList.toggle("active", role === 'faculty');
  document.getElementById("btnRoleStaff").classList.toggle("active", role === 'staff');

  const userSection = document.getElementById("userSection");
  const staffSection = document.getElementById("staffSection");
  const facultyBanner = document.getElementById("facultyNoticeBanner");
  const cartCardTitle = document.getElementById("cartCardTitle");
  const lblName = document.getElementById("lblName");
  const lblId = document.getElementById("lblId");
  const inputName = document.getElementById("custName");
  const inputId = document.getElementById("custId");
  const phoneFieldGroup = document.getElementById("phoneFieldGroup");

  if (role === 'staff') {
    userSection.classList.remove("active");
    staffSection.classList.add("active");
    loadStaffOrders();
  } else {
    staffSection.classList.remove("active");
    userSection.classList.add("active");

    if (role === 'faculty') {
      facultyBanner.classList.remove("hidden");
      cartCardTitle.innerText = "Faculty Priority Cart";
      lblName.innerText = "Faculty Name";
      lblId.innerText = "Department";
      inputName.placeholder = "Enter faculty name";
      inputId.placeholder = "Enter department name";
      phoneFieldGroup.style.display = "none";
    } else {
      facultyBanner.classList.add("hidden");
      cartCardTitle.innerText = "Student Order Cart";
      lblName.innerText = "Student Name";
      lblId.innerText = "Student ID / USN";
      inputName.placeholder = "Enter student name";
      inputId.placeholder = "Enter student ID";
      phoneFieldGroup.style.display = "block";
    }

    // Load active token specific to this current view
    syncRoleTokenUI(role);
    startStatusPolling();
  }
}

// Check role storage and show token only if it belongs to that role
function syncRoleTokenUI(role) {
  const storageKey = (role === 'faculty') ? "active_faculty_token" : "active_student_token";
  const savedTokenData = localStorage.getItem(storageKey);

  const banner = document.getElementById("tokenResult");
  if (savedTokenData) {
    const data = JSON.parse(savedTokenData);
    if (data.status === "Completed") {
      resetPortal(role);
    } else {
      updateTokenBannerUI(data.token, data.total, data.status, role, data.items || []);
    }
  } else {
    if (banner) {
      banner.classList.add("hidden");
      banner.style.display = "none";
    }
  }
}

// Real-Time Polling: Checks C++ server every 1.5 seconds
function startStatusPolling() {
  if (statusPollingInterval) clearInterval(statusPollingInterval);

  statusPollingInterval = setInterval(async () => {
    if (currentRole === 'staff') return;

    const storageKey = (currentRole === 'faculty') ? "active_faculty_token" : "active_student_token";
    const savedTokenData = localStorage.getItem(storageKey);
    if (!savedTokenData) return;

    const data = JSON.parse(savedTokenData);

    try {
      const res = await fetch(`${API_BASE}/orders`);
      const orders = await res.json();
      const myOrder = orders.find(o => o.token === data.token);

      if (myOrder) {
        updateTokenBannerUI(myOrder.token, myOrder.total, myOrder.status, currentRole, data.items || []);
        
        localStorage.setItem(storageKey, JSON.stringify({
          token: myOrder.token,
          total: myOrder.total,
          status: myOrder.status,
          role: currentRole,
          items: data.items || []
        }));

        if (myOrder.status === "Completed") {
          setTimeout(() => {
            resetPortal(currentRole);
          }, 3000);
        }
      }
    } catch (err) {
      console.warn("Polling error:", err);
    }
  }, 1500);
}

// Reset view back to clean state
function resetPortal(roleToReset) {
  const targetRole = roleToReset || currentRole;
  const storageKey = (targetRole === 'faculty') ? "active_faculty_token" : "active_student_token";
  localStorage.removeItem(storageKey);

  if (currentRole === targetRole) {
    const banner = document.getElementById("tokenResult");
    if (banner) {
      banner.classList.add("hidden");
      banner.style.display = "none";
    }

    const nameInput = document.getElementById("custName");
    const idInput = document.getElementById("custId");
    const phoneInput = document.getElementById("custPhone");
    if (nameInput) nameInput.value = "";
    if (idInput) idInput.value = "";
    if (phoneInput) phoneInput.value = "";

    cart = {};
    updateCartUI();
  }
}

// Update Active Token Card with Itemized Table
function updateTokenBannerUI(token, total, status, role = "student", items = []) {
  const banner = document.getElementById("tokenResult");
  const tokenEl = document.getElementById("displayToken");
  const detailsEl = document.getElementById("displayOrderDetails");
  const hintEl = document.getElementById("displayTokenHint");
  const headerEl = document.getElementById("displayTokenHeader");
  const itemsTbody = document.getElementById("tokenItemsList");

  if (!banner) return;

  banner.classList.remove("hidden");
  banner.style.display = "block";
  if (tokenEl) tokenEl.innerText = token;

  if (role === "faculty") {
    banner.classList.add("faculty-token-banner");
    headerEl.innerText = "🎖️ FACULTY EXPRESS TOKEN";
  } else {
    banner.classList.remove("faculty-token-banner");
    headerEl.innerText = "YOUR ACTIVE TOKEN";
  }

  let badgeClass = "status-pending";
  let message = "Show this token number at the canteen counter for pickup.";

  if (status === "Preparing") {
    badgeClass = "status-preparing";
    message = "👨‍🍳 Kitchen has started preparing your order. Please wait...";
  } else if (status === "Ready") {
    badgeClass = "status-ready";
    message = "🔔 YOUR ORDER IS READY! Please collect it at the counter now.";
  } else if (status === "Completed") {
    badgeClass = "status-completed";
    message = "✅ Order collected! Thank you for dining with MM Foods.";
  }

  if (detailsEl) {
    detailsEl.innerHTML = `Total: <strong>₹${parseFloat(total).toFixed(2)}</strong> | Status: <span class="status-tag ${badgeClass}">${status}</span>`;
  }

  // Populate Itemized Table matching screenshot
  if (itemsTbody && items.length > 0) {
    itemsTbody.innerHTML = "";
    items.forEach(itm => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">${itm.name}</td>
        <td style="text-align:center;">${itm.qty}</td>
        <td style="text-align:right; font-weight:600;">₹${(itm.price * itm.qty).toFixed(2)}</td>
      `;
      itemsTbody.appendChild(tr);
    });
  }

  if (hintEl) {
    hintEl.innerHTML = `
      <div><strong>${message}</strong></div>
      <div style="margin-top: 8px;">
        <button type="button" onclick="resetPortal('${role}')" style="background:#E2E8F0; border:none; padding:4px 10px; font-size:0.75rem; border-radius:4px; cursor:pointer; color:#475569;">
          ✕ Clear / Start New Order
        </button>
      </div>
    `;
  }
}

// Notice Modal
function showNoticeModal(msg) {
  const overlay = document.getElementById("modalOverlay");
  const header = document.getElementById("modalHeaderBg");
  const titleEl = document.getElementById("modalTitle");
  const messageEl = document.getElementById("modalMessage");
  const okBtn = document.getElementById("btnModalClose");

  if (header) header.className = "modal-header";
  if (titleEl) titleEl.innerText = "Notice";
  if (messageEl) messageEl.innerHTML = `<p style="padding:10px 0; font-size:0.95rem;">${msg}</p>`;
  if (okBtn) okBtn.innerText = "OK";

  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
  }
}

// Order Confirmation Modal: stays open until user clicks button
function showSuccessModal(token, total, role = "student") {
  const overlay = document.getElementById("modalOverlay");
  const header = document.getElementById("modalHeaderBg");
  const titleEl = document.getElementById("modalTitle");
  const messageEl = document.getElementById("modalMessage");
  const okBtn = document.getElementById("btnModalClose");

  if (role === "faculty") {
    if (header) header.className = "modal-header faculty-header";
    if (titleEl) titleEl.innerText = "Faculty Express Order Placed!";
  } else {
    if (header) header.className = "modal-header success-header";
    if (titleEl) titleEl.innerText = "Order Placed Successfully!";
  }

  if (messageEl) {
    messageEl.innerHTML = `
      <div style="text-align:center; padding: 6px 0;">
        <p style="font-size:1.05rem; color:#475569; margin-bottom: 6px;">Your ${role === 'faculty' ? 'Faculty Priority ' : ''}order has been recorded!</p>
        <div style="font-size:3rem; font-weight:800; color:#0F2C59; letter-spacing:1px; margin: 12px 0;">${token}</div>
        <p style="font-size:1.15rem; font-weight:700; color:#15803D; margin-bottom: 12px;">Total Payable: ₹${parseFloat(total).toFixed(2)}</p>
        <div style="background:#FEF3C7; color:#92400E; padding:10px 14px; border-radius:6px; font-size:0.88rem; font-weight:600;">
          ⚠️ Please note this Token: <strong>${token}</strong>
        </div>
      </div>
    `;
  }
  
  if (okBtn) okBtn.innerText = "OK, I Noted My Token";

  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
  }
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }
}

// 1. Fetch Menu from C++ Backend
async function fetchMenu() {
  try {
    const res = await fetch(`${API_BASE}/menu`);
    allMenuItems = await res.json();
    renderMenu(allMenuItems);
  } catch (err) {
    console.error("Failed to connect to C++ backend:", err);
    document.getElementById("menuGrid").innerHTML = 
      `<p style="color:red; grid-column: 1/-1;">Error: Unable to connect to C++ backend at http://localhost:8080. Ensure .\\server.exe is running.</p>`;
  }
}

// Render Menu Cards
function renderMenu(items) {
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "food-card";
    card.innerHTML = `
      <div>
        <span class="food-category">${item.category}</span>
        <h3 class="food-name">${item.name}</h3>
      </div>
      <div class="food-bottom">
        <span class="food-price">₹${item.price.toFixed(2)}</span>
        <button class="btn-add" type="button" onclick="addToCart(${item.id})">+ Add</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Filter Categories
function filterCategory(cat) {
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  event.target.classList.add("active");

  if (cat === "All") {
    renderMenu(allMenuItems);
  } else {
    const filtered = allMenuItems.filter(i => i.category.toLowerCase().includes(cat.toLowerCase()));
    renderMenu(filtered);
  }
}

// Cart Operations
function addToCart(id) {
  const item = allMenuItems.find(i => i.id === id);
  if (!item) return;

  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { item: item, qty: 1 };
  }
  updateCartUI();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) {
    delete cart[id];
  }
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById("cartContainer");
  const keys = Object.keys(cart);

  if (keys.length === 0) {
    container.innerHTML = `<p class="empty-state">Cart is currently empty.<br>Add items from the menu.</p>`;
    document.getElementById("subtotalVal").innerText = "₹0.00";
    document.getElementById("totalVal").innerText = "₹0.00";
    return;
  }

  container.innerHTML = "";
  let total = 0;

  keys.forEach(id => {
    const entry = cart[id];
    const subtotal = entry.item.price * entry.qty;
    total += subtotal;

    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div>
        <div style="font-weight:600">${entry.item.name}</div>
        <div style="color:var(--text-muted); font-size:0.75rem">₹${entry.item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-qty-ctrl">
        <button class="btn-qty" type="button" onclick="changeQty(${id}, -1)">-</button>
        <span>${entry.qty}</span>
        <button class="btn-qty" type="button" onclick="changeQty(${id}, 1)">+</button>
        <span style="font-weight:600; margin-left:8px; min-width:50px; text-align:right">₹${subtotal.toFixed(2)}</span>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById("subtotalVal").innerText = `₹${total.toFixed(2)}`;
  document.getElementById("totalVal").innerText = `₹${total.toFixed(2)}`;
}

// 2. Submit Order: Differentiates Student vs Faculty
async function placeOrder(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const keys = Object.keys(cart);
  if (keys.length === 0) {
    showNoticeModal("Please add at least one item to your cart before confirming.");
    return false;
  }

  const nameInput = document.getElementById("custName");
  const idInput = document.getElementById("custId");
  const phoneInput = document.getElementById("custPhone");

  const sName = nameInput.value.trim();
  const sId = idInput.value.trim();
  const sPhone = phoneInput.value.trim();

  // Role-specific Validations
  if (currentRole === "faculty") {
    if (!sName) {
      showNoticeModal("Please enter the Faculty Name.");
      nameInput.focus();
      return false;
    }
    if (!sId) {
      showNoticeModal("Please enter the Department.");
      idInput.focus();
      return false;
    }
  } else {
    if (!sName) {
      showNoticeModal("Please enter the Student Name.");
      nameInput.focus();
      return false;
    }
    if (!sId) {
      showNoticeModal("Please enter the Student ID / USN.");
      idInput.focus();
      return false;
    }
    if (!sPhone || sPhone.length < 10) {
      showNoticeModal("Please enter a valid 10-digit Phone Number.");
      phoneInput.focus();
      return false;
    }
  }

  const itemsPayload = keys.map(id => ({
    id: parseInt(id),
    name: cart[id].item.name,
    price: cart[id].item.price,
    qty: cart[id].qty
  }));

  const prefix = (currentRole === "faculty") ? "[FACULTY] " : "";
  const payload = {
    studentName: `${prefix}${sName} (${sId})`,
    studentPhone: (currentRole === "faculty") ? `Dept: ${sId}` : sPhone,
    items: itemsPayload
  };

  try {
    const res = await fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const orderRole = currentRole;
    const storageKey = (orderRole === 'faculty') ? "active_faculty_token" : "active_student_token";

    // Save strictly to this role's storage key
    localStorage.setItem(storageKey, JSON.stringify({
      token: data.token,
      total: data.total,
      status: data.status,
      role: orderRole,
      items: itemsPayload
    }));

    showSuccessModal(data.token, data.total, orderRole);
    updateTokenBannerUI(data.token, data.total, data.status, orderRole, itemsPayload);
    startStatusPolling();

    nameInput.value = "";
    idInput.value = "";
    phoneInput.value = "";
    cart = {};
    updateCartUI();

  } catch (err) {
    showNoticeModal("Error connecting to backend server. Make sure server.exe is running in terminal.");
    console.error(err);
  }

  return false;
}

// 3. Load Staff Queue from C++ Backend (Showing Badges for Faculty)
async function loadStaffOrders() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading orders from C++ server...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/orders`);
    const orders = await res.json();

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:gray;">No orders placed yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    orders.reverse().forEach(ord => {
      const itemsList = ord.items.map(i => `${i.qty}× ${i.name}`).join("<br>");
      
      let badgeClass = "status-pending";
      if (ord.status === "Preparing") badgeClass = "status-preparing";
      if (ord.status === "Ready") badgeClass = "status-ready";
      if (ord.status === "Completed") badgeClass = "status-completed";

      let actionButton = "";
      if (ord.status === "Pending") {
        actionButton = `<button class="btn-action btn-prep" type="button" onclick="updateStatus('${ord.token}', 'Preparing')">Start Preparing</button>`;
      } else if (ord.status === "Preparing") {
        actionButton = `<button class="btn-action btn-ready" type="button" onclick="updateStatus('${ord.token}', 'Ready')">Mark Ready</button>`;
      } else if (ord.status === "Ready") {
        actionButton = `<button class="btn-action" type="button" style="background:#475569; color:white" onclick="updateStatus('${ord.token}', 'Completed')">Hand Over</button>`;
      } else {
        actionButton = `<span style="color:gray; font-size:0.75rem;">Done</span>`;
      }

      const isFaculty = ord.studentName.includes("[FACULTY]");
      const roleBadge = isFaculty 
        ? `<span class="badge-faculty">🎖️ FACULTY PRIORITY</span><br>` 
        : ``;

      let contactInfo = "";
      if (isFaculty) {
        contactInfo = `<div style="font-size:0.8rem; color:#6B21A8; margin-top:2px; font-weight:600;">🏛️ ${ord.studentPhone}</div>`;
      } else {
        contactInfo = `<div style="font-size:0.82rem; color:#D35400; margin-top:2px; font-weight:600;">📞 <a href="tel:${ord.studentPhone}" style="color:#D35400; text-decoration:none;">${ord.studentPhone}</a></div>`;
      }

      const studentInfo = `
        ${roleBadge}
        <div style="font-weight:700; color:#1E293B;">${ord.studentName.replace("[FACULTY] ", "")}</div>
        ${contactInfo}
      `;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:800; color:${isFaculty ? '#6B21A8' : 'var(--rvu-primary)'}; font-size:1.05rem;">${ord.token}</td>
        <td>${studentInfo}</td>
        <td>${ord.time}</td>
        <td>${itemsList}</td>
        <td style="font-weight:700;">₹${ord.total.toFixed(2)}</td>
        <td><span class="status-tag ${badgeClass}">${ord.status}</span></td>
        <td>${actionButton}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Staff orders fetch failed:", err);
  }
}

// 4. Update Status via Staff Console
async function updateStatus(token, nextStatus) {
  try {
    await fetch(`${API_BASE}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token, status: nextStatus })
    });
    loadStaffOrders();
  } catch (err) {
    showNoticeModal("Failed to update status.");
  }
}