const API_URL = "/api";
const UPLOADS_URL = "/uploads";
let currentRole = "client";

function showStatus(message, isError = false) {
  const el = document.getElementById("statusMsg");
  el.textContent = message;
  el.className = isError ? "status error" : "status";
}

function setRole(role) {
  currentRole = role;
  document.querySelectorAll(".contractor-only").forEach((el) => {
    el.classList.toggle("hidden", role !== "contractor");
  });
  showStatus(`Switched to ${role === "contractor" ? "Contractor" : "Client"} view.`);
}

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

document.getElementById("roleClientBtn").addEventListener("click", () => setRole("client"));
document.getElementById("roleContractorBtn").addEventListener("click", () => setRole("contractor"));

// Catalog: Load & Add
async function loadCatalog() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.products || [];
    const container = document.getElementById("catalogList");

    if (list.length === 0) {
      container.innerHTML = "<p>No products in catalog yet.</p>";
      return;
    }

    container.innerHTML = list
      .map((p) => {
        const price = Number(p.price_per_sqft ?? p.unit_price ?? 0);
        const waste = Number(p.waste_percent ?? 10);
        const adj = (price * (1 + waste / 100)).toFixed(2);
        return `
          <div class="card">
            <strong>${p.name ?? p.product_name}</strong>
            <div>$${price.toFixed(2)} / sq ft (${waste}% waste → $${adj}/sq ft)</div>
            <div>Category: ${p.category || "—"} | Box: ${p.box_sqft ?? "—"} sq ft</div>
            <div>Dimensions: ${p.dimensions || "—"}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    showStatus(`Catalog error: ${err.message}`, true);
  }
}

document.getElementById("refreshCatalogBtn").addEventListener("click", loadCatalog);

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const productName = document.getElementById("prodName").value.trim();
    const priceVal = Number(document.getElementById("prodPrice").value);
    const body = {
      product_name: productName,
      name: productName,
      category: document.getElementById("prodCategory").value.trim(),
      pricing_unit: "sqft",
      unit_price: priceVal,
      price_per_sqft: priceVal,
      box_sqft: Number(document.getElementById("prodBoxSqft").value || 0),
      dimensions: document.getElementById("prodDimensions").value.trim(),
      waste_percent: Number(document.getElementById("prodWaste").value || 10),
    };

    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add product");

    e.target.reset();
    showStatus("Product added to catalog.");
    loadCatalog();
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Project Request: Add Room & Submit with Photos
document.getElementById("addRoomBtn").addEventListener("click", () => {
  const row = document.createElement("div");
  row.className = "room-row";
  row.innerHTML = `
    <input type="text" class="room-name" placeholder="Room name" required />
    <input type="number" step="0.1" class="room-len" placeholder="Length (ft)" required />
    <input type="number" step="0.1" class="room-wid" placeholder="Width (ft)" required />
  `;
  document.getElementById("roomsContainer").appendChild(row);
});

document.getElementById("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const photoFiles = Array.from(document.getElementById("reqPhotos").files);
  if (photoFiles.length > 5) {
    showStatus("Please select 5 photos or fewer.", true);
    return;
  }

  const rooms = Array.from(document.querySelectorAll(".room-row")).map((row) => ({
    room_name: row.querySelector(".room-name").value.trim(),
    length_ft: Number(row.querySelector(".room-len").value),
    width_ft: Number(row.querySelector(".room-wid").value),
    product_id: 1,
  }));

  const totalSqft = rooms.reduce((sum, r) => sum + r.length_ft * r.width_ft, 0);

  const addressEl = document.getElementById("reqAddress");
  const serviceAddress = addressEl
  ? addressEl.value.trim()
  : document.getElementById("reqTitle").value.trim();

  const formData = new FormData();
  formData.append("client_id", document.getElementById("reqClientId").value);
  formData.append("service_address", serviceAddress);
  formData.append("project_title", document.getElementById("reqTitle").value.trim());
  formData.append("notes", document.getElementById("reqNotes").value.trim());
  formData.append("total_sqft", String(totalSqft));
  formData.append("rooms", JSON.stringify(rooms));
  photoFiles.forEach((file) => formData.append("photos", file));

  try {
    const res = await fetch(`${API_URL}/requests`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit request");

    e.target.reset();
    showStatus("Project request submitted!");
    loadRequests();
  } catch (err) {
    showStatus(err.message, true);
  }
});

document.getElementById("refreshQuotesBtn").addEventListener("click", loadQuotes);
document.getElementById("refreshBillsBtn").addEventListener("click", loadBills);

// Contractor creates a quote version (quantity is calculated server-side with waste_percentage)
document.getElementById("createQuoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const body = {
      request_id: Number(document.getElementById("quoteRequestId").value),
      waste_percentage: Number(document.getElementById("quoteWastePct").value || 10),
      estimated_labor_cost: Number(document.getElementById("quoteLaborCost").value || 0),
      other_charges_discounts: Number(document.getElementById("quoteOtherAdj").value || 0),
      proposed_installation_window: document.getElementById("quoteWindow").value.trim(),
      note: document.getElementById("quoteNote").value.trim(),
      line_items: [
        {
          item_type: "material",
          description: document.getElementById("quoteMaterialDesc").value.trim() || "Flooring Material",
          quantity: 1,
          unit_price: Number(document.getElementById("quoteMaterialUnitPrice").value),
        },
      ],
    };

    const res = await fetch(`${API_URL}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create quote");

    e.target.reset();
    showStatus(`Quote v${data.quote_version} created ($${Number(data.total_quoted_price).toFixed(2)}).`);
    loadQuotes();
    loadRequests();
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Send negotiation message on a request
document.getElementById("negotiationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const requestId = Number(document.getElementById("msgRequestId").value);
    const body = {
      sender_type: document.getElementById("msgSenderType").value,
      message_text: document.getElementById("msgText").value.trim(),
    };

    const res = await fetch(`${API_URL}/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send message");

    document.getElementById("msgText").value = "";
    showStatus(`Negotiation message sent for Request #${requestId}.`);
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Accept a quote from a quote card
async function acceptQuote(quoteId) {
  try {
    const res = await fetch(`${API_URL}/quotes/${quoteId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to accept quote");

    showStatus(`Quote #${quoteId} accepted! Order #${data.order_id} created.`);
    loadQuotes();
    loadRequests();
  } catch (err) {
    showStatus(err.message, true);
  }
}

async function loadQuotes() {
  try {
    const res = await fetch(`${API_URL}/quotes`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.quotes || [];
    const container = document.getElementById("quotesList");

    if (list.length === 0) {
      container.innerHTML = "<p>No quotes yet.</p>";
      return;
    }

    container.innerHTML = list
      .map((q) => {
        const qId = q.quote_id ?? q.id;
        const total = Number(q.total_quoted_price ?? q.total_amount ?? 0).toFixed(2);
        const status = q.status || "Pending";
        return `
          <div class="card">
            <strong>Quote #${qId} (v${q.quote_version ?? 1}) — Request #${q.request_id}</strong>
            <div>Status: ${status} | Total: $${total}</div>
            <div>Material: $${Number(q.estimated_material_cost ?? 0).toFixed(2)} | Labor: $${Number(q.estimated_labor_cost ?? 0).toFixed(2)} | Waste: ${q.waste_percentage ?? 10}%</div>
            <div>Window: ${q.proposed_installation_window || "—"}</div>
            <div>${q.note || ""}</div>
            ${status !== "Accepted" ? `<button type="button" onclick="acceptQuote(${qId})">Accept Quote</button>` : ""}
          </div>
        `;
      })
      .join("");
  } catch (err) {
    showStatus(`Quotes error: ${err.message}`, true);
  }
}

// Contractor creates a bill version for an order
document.getElementById("createBillForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const body = {
      order_id: Number(document.getElementById("billOrderId").value),
      total_billed_amount: Number(document.getElementById("billAmount").value),
    };

    const res = await fetch(`${API_URL}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create bill");

    e.target.reset();
    showStatus(`Bill v${data.bill_version} created for Order #${body.order_id}.`);
    loadBills();
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Submit dispute or response on a bill
document.getElementById("disputeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const billId = Number(document.getElementById("disputeBillId").value);
    const body = {
      author_type: document.getElementById("disputeAuthorType").value,
      message: document.getElementById("disputeMessage").value.trim(),
    };

    const res = await fetch(`${API_URL}/bills/${billId}/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to log dispute");

    document.getElementById("disputeMessage").value = "";
    showStatus(`Dispute note logged for Bill #${billId}.`);
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Pay a bill
document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const billId = Number(document.getElementById("payBillId").value);
    const body = {
      amount_paid: Number(document.getElementById("payAmount").value),
      payment_method: document.getElementById("payMethod").value.trim() || "Credit Card",
    };

    const res = await fetch(`${API_URL}/bills/${billId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to record payment");

    e.target.reset();
    showStatus(`Payment recorded for Bill #${billId} (Payment #${data.payment_id}).`);
    loadBills();
  } catch (err) {
    showStatus(err.message, true);
  }
});

async function loadBills() {
  try {
    const res = await fetch(`${API_URL}/bills`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.bills || [];
    const container = document.getElementById("billsList");

    if (list.length === 0) {
      container.innerHTML = "<p>No bills yet.</p>";
      return;
    }

    container.innerHTML = list
      .map((b) => {
        const bId = b.bill_id ?? b.id;
        const amt = Number(b.total_billed_amount ?? b.total_amount ?? 0).toFixed(2);
        return `
          <div class="card">
            <strong>Bill #${bId} (v${b.bill_version ?? 1}) — Order #${b.order_id}</strong>
            <div>Status: ${b.status || "Unpaid"} | Amount: $${amt}</div>
            <div>Address: ${b.service_address || "—"}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    showStatus(`Bills error: ${err.message}`, true);
  }
}

async function loadRequests() {
  try {
    const res = await fetch(`${API_URL}/requests`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.requests || [];
    const container = document.getElementById("requestsList");

    container.innerHTML = list
      .map((req) => {
        const photos = Array.isArray(req.photos) ? req.photos : [];
        const imgs = photos
          .map((ph) => {
            const name = typeof ph === "string" ? ph : ph.file_path || ph.filename;
            return `<img src="${UPLOADS_URL}/${name}" class="photo-preview" alt="Site photo" />`;
          })
          .join("");
        return `
          <div class="card">
            <strong>#${req.request_id ?? req.id} — ${req.service_address || req.project_title || "Request"}</strong>
            <div>Total Area: ${req.total_requested_area ?? req.total_sqft ?? "—"} sq ft | Status: ${req.status || "Submitted"}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    showStatus(`Requests error: ${err.message}`, true);
  }
}




// Initial load
setRole("client");
loadCatalog();
loadRequests();
loadQuotes();
loadBills();
