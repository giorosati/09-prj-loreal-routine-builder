/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("userInput");

/* Change this URL when you deploy the Worker */
const workerBaseUrl = "http://127.0.0.1:8787";

/* Keep every message we send so we can keep the conversation alive */
const conversation = [];
/* Track selected products so we can toggle them */
const selectedProducts = new Map();
/* Cache the product catalog after the first load */
let allProducts = [];

/* Helper to show a message bubble in the chat window */
function addChatMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}`;

  const title = document.createElement("strong");
  title.textContent = role === "user" ? "You:" : "Advisor:";

  const body = document.createElement("p");
  body.textContent = text;

  wrapper.appendChild(title);
  wrapper.appendChild(body);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return body;
}

/* Ask our Worker for a reply from OpenAI */
async function requestChatCompletion() {
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
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
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
}

function renderSelectedProducts() {
  if (selectedProducts.size === 0) {
    selectedProductsList.innerHTML = `<p class="selected-placeholder">No products selected yet.</p>`;
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
    });
  });
}

function updateSelectedStyles() {
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const id = card.dataset.productId;
    card.classList.toggle("selected", selectedProducts.has(String(id)));
  });
}

loadProducts().then((products) => {
  allProducts = products;
});

renderSelectedProducts();

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = chatInput.value.trim();
  if (!userMessage) {
    return;
  }

  addChatMessage("user", userMessage);
  conversation.push({ role: "user", content: userMessage });
  chatInput.value = "";

  const assistantBubble = addChatMessage("assistant", "Thinking…");

  try {
    const reply = await requestChatCompletion();
    conversation.push({ role: "assistant", content: reply });

    assistantBubble.textContent = reply;
  } catch (error) {
    assistantBubble.textContent = "Sorry, something went wrong. Please try again.";
    console.error("Chat error", error);
  }
});
