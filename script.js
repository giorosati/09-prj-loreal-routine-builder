/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectedButton = document.getElementById("clearSelectedProducts");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("userInput");

const STORAGE_KEY = "loreal-selected-products";

/* For local hosting */
// const workerBaseUrl = "http://127.0.0.1:8787";

/* For deployment */
const workerBaseUrl = 'https://loreal-app-worker.giovanni-rosati.workers.dev'

/* Keep every message we send so we can keep the conversation alive */
const conversation = [];
/* Track selected products so we can toggle them */
const selectedProducts = new Map();
/* Add the system message once so replies stay on topic */
function ensureSystemMessage() {
  const hasSystem = conversation.some((message) => message.role === "system");
  if (!hasSystem) {
    conversation.unshift({
      role: "system",
      content:
        "You are the L'Oréal Smart Product Advisor. Only answer questions about L'Oréal products, skincare routines, ingredients, or recommendations, and politely decline anything else. When helping with routines, craft concise step-by-step guidance, call out morning versus evening use, and explain why each recommended product fits.",
    });
  }
}
/* Cache the product catalog after the first load */
let allProducts = [];

/* Simple keyword check to keep questions beauty-focused */
function isAllowedTopic(message) {
  const normalized = message.toLowerCase();
  const keywords = [
    "skin",
    "skincare",
    "hair",
    "haircare",
    "makeup",
    "fragrance",
    "routine",
    "beauty",
    "product",
    "ingredient",
    "serum",
    "cleanser",
    "moisturizer",
    "spf",
    "l'oreal",
    "loreal"
  ];

  return keywords.some((keyword) => normalized.includes(keyword)) || normalized.trim().length <= 6;
}

/* Helper to show a message bubble in the chat window */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineFormatting(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text).replace(/\r\n/g, "\n");
  const lines = escaped.split("\n");
  const htmlParts = [];
  let listBuffer = null;

  const flushList = () => {
    if (!listBuffer) {
      return;
    }
    const items = listBuffer.items.join("");
    htmlParts.push(`<${listBuffer.type}>${items}</${listBuffer.type}>`);
    listBuffer = null;
  };

  const addListItem = (type, value) => {
    if (!listBuffer || listBuffer.type !== type) {
      flushList();
      listBuffer = { type, items: [] };
    }
    listBuffer.items.push(`<li>${applyInlineFormatting(value)}</li>`);
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      htmlParts.push("<br>");
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = applyInlineFormatting(headingMatch[2]);
      htmlParts.push(`<h${level}>${content}</h${level}>`);
      return;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      addListItem("ol", orderedMatch[2]);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      addListItem("ul", unorderedMatch[1]);
      return;
    }

    flushList();
    htmlParts.push(`<p>${applyInlineFormatting(trimmed)}</p>`);
  });

  flushList();

  return htmlParts
    .join("")
    .replace(/(<br>){2,}/g, "<br>")
    .replace(/<br>(<\/h[1-3]>)/g, "$1")
    .replace(/(<p>)(<br>)+/g, "$1");
}

function addChatMessage(role, text, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const title = document.createElement("strong");
  title.textContent = role === "user" ? "You:" : "Advisor:";

  const body = document.createElement(options.isMarkdown ? "div" : "p");
  if (options.isMarkdown) {
    body.innerHTML = renderMarkdown(text);
  } else {
    body.textContent = text;
  }

  wrapper.appendChild(title);
  wrapper.appendChild(body);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return body;
}

/* Ask our Worker for a reply from OpenAI */
async function requestChatCompletion() {
  ensureSystemMessage();

  const response = await fetch(`${workerBaseUrl}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: conversation,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("No content returned from OpenAI");
  }

  return reply.trim();
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match this category yet.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}" tabindex="0">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  attachProductHandlers(filteredProducts);
});

function attachProductHandlers(products) {
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.productId;
      const product = products.find((item) => String(item.id) === String(id));
      if (!product) {
        return;
      }
      toggleProduct(product);
    });
  });
  updateSelectedStyles();
}

function toggleProduct(product) {
  if (selectedProducts.has(String(product.id))) {
    selectedProducts.delete(String(product.id));
  } else {
    selectedProducts.set(String(product.id), product);
  }
  renderSelectedProducts();
  updateSelectedStyles();
  persistSelectedProducts();
}

function renderSelectedProducts() {
  if (selectedProducts.size === 0) {
    selectedProductsList.innerHTML = `<p class="selected-placeholder">No products selected yet.</p>`;
    if (clearSelectedButton) {
      clearSelectedButton.disabled = true;
    }
    return;
  }

  selectedProductsList.innerHTML = Array.from(selectedProducts.values())
    .map(
      (product) => `
        <div class="selected-item" data-product-id="${product.id}">
          <span>${product.name}</span>
          <button type="button" class="selected-remove" aria-label="Remove ${product.name}">×</button>
        </div>
      `
    )
    .join("");

  selectedProductsList.querySelectorAll(".selected-remove").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.parentElement.dataset.productId;
      selectedProducts.delete(String(id));
      renderSelectedProducts();
      updateSelectedStyles();
      persistSelectedProducts();
    });
  });

  if (clearSelectedButton) {
    clearSelectedButton.disabled = false;
  }
}

function updateSelectedStyles() {
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const id = card.dataset.productId;
    card.classList.toggle("selected", selectedProducts.has(String(id)));
  });
}

function persistSelectedProducts() {
  const payload = Array.from(selectedProducts.entries()).map(([id, product]) => ({
    id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    image: product.image,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function hydrateSelectedProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = JSON.parse(stored);
    parsed.forEach((product) => {
      if (product && product.id) {
        selectedProducts.set(String(product.id), product);
      }
    });
  } catch (error) {
    console.error("Failed to hydrate selected products", error);
  }
}

function getSelectedProductsData() {
  return Array.from(selectedProducts.values()).map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));
}

loadProducts().then((products) => {
  allProducts = products;
  hydrateSelectedProducts();
  renderSelectedProducts();
  updateSelectedStyles();
});

renderSelectedProducts();

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = chatInput.value.trim();
  if (!userMessage) {
    return;
  }

  if (!isAllowedTopic(userMessage)) {
    addChatMessage(
      "assistant",
      "Let's stay focused on beauty routines and products. Ask me about skincare, haircare, makeup, fragrance, or your L'Oréal routine."
    );
    chatInput.value = "";
    return;
  }

  addChatMessage("user", userMessage);
  conversation.push({ role: "user", content: userMessage });
  chatInput.value = "";

  const assistantBubble = addChatMessage("assistant", "Thinking…", { isMarkdown: true });

  try {
    const reply = await requestChatCompletion();
    conversation.push({ role: "assistant", content: reply });

    assistantBubble.innerHTML = renderMarkdown(reply);
  } catch (error) {
    assistantBubble.textContent = "Sorry, something went wrong. Please try again.";
    console.error("Chat error", error);
  }
});

if (generateRoutineButton) {
  generateRoutineButton.addEventListener("click", async () => {
    const items = getSelectedProductsData();

    if (items.length === 0) {
      addChatMessage("assistant", "Select at least one product to build a personalized routine.");
      return;
    }

      addChatMessage("user", "Please create a personalized routine with my selected products.");

    conversation.push({
      role: "user",
      content: `Create a personalized beauty routine using the following selected products provided as JSON. Include morning and evening steps, explain each recommendation briefly, and suggest the order of application.\n${JSON.stringify(items, null, 2)}`,
    });

    const assistantBubble = addChatMessage("assistant", "Building your personalized routine…", { isMarkdown: true });

    try {
      const reply = await requestChatCompletion();
      conversation.push({ role: "assistant", content: reply });
      assistantBubble.innerHTML = renderMarkdown(reply);
    } catch (error) {
      assistantBubble.textContent = "Sorry, I couldn't build the routine. Please try again.";
      console.error("Routine generation error", error);
    }
  });
}

if (clearSelectedButton) {
  clearSelectedButton.addEventListener("click", () => {
    selectedProducts.clear();
    renderSelectedProducts();
    updateSelectedStyles();
    persistSelectedProducts();
  });
}
