// CONFIGURAÇÕES GERAIS
// URL da sua planilha publicada em CSV
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?output=csv";

const productsContainer = document.getElementById("produtos-container");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const subtotalEl = document.getElementById("subtotal");
const addressInput = document.getElementById("address");

let tempProduct = null;
let selectedColor = "";

// --- FUNÇÃO PARA IGNORAR ACENTOS (ADICIONADA) ---
function normalizarParaBusca(texto) {
    if (!texto) return "";
    return texto.toString().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function openSizeSelector(id, name, price, img) {
  tempProduct = { id, name, price, img };
  selectedColor = ""; // Reseta a cor
  document.getElementById("size-product-name").innerText = name;
  document.getElementById("modal-step-title").innerText = "Selecione a Cor";
  document.getElementById("color-step").style.display = "grid";
  document.getElementById("size-step").style.display = "none";
  document.getElementById("size-modal").style.display = "flex";
}

function selectColor(color) {
  selectedColor = color;
  document.getElementById("modal-step-title").innerText = "Selecione o Tamanho";
  document.getElementById("color-step").style.display = "none";
  document.getElementById("size-step").style.display = "grid";
}

function finishSelection(size) {
  if (tempProduct) {
    const finalName = `${tempProduct.name} (${selectedColor} / ${size})`;
    const uniqueID = `${tempProduct.id}-${selectedColor}-${size}`;

    addToCart(uniqueID, finalName, tempProduct.price, tempProduct.img);
    closeSizeModal();
    
    Toastify({
        text: `Adicionado: ${size}`,
        duration: 1500,
        style: { background: "#8e5fb1" }
    }).showToast();
  }
}

function closeSizeModal() {
  document.getElementById("size-modal").style.display = "none";
}

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

//*barra de pesquisa (CORRIGIDA PARA IGNORAR ACENTOS)
const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", (e) => {
  const term = normalizarParaBusca(e.target.value);

  const filtered = allProducts.filter((p) => {
    const nome = normalizarParaBusca(p["Nome do Produto"]);
    const categoria = normalizarParaBusca(p["Categoria"]);
    return nome.includes(term) || categoria.includes(term);
  });

  renderProducts(filtered);

  if (filtered.length === 0) {
    productsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.2;"></i>
                <p>Nenhum produto encontrado com "<strong>${e.target.value}</strong>"</p>
            </div>
        `;
  }
});

// 1. CARREGAMENTO DE PRODUTOS DA PLANILHA
async function loadProducts() {
  try {
    const response = await fetch(CSV_URL);
    const data = await response.text();
    
    const rows = data.split(/\r?\n/).filter(row => row.trim() !== "").map((row) => {
      return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    });

    if (rows.length < 2) return; 

    const headers = rows[0].map((h) => h.replace(/"/g, "").trim());
    const precoIndex = headers.indexOf("Preço");

    allProducts = rows
      .slice(1)
      .map((row) => {
        let obj = {};
        headers.forEach((header, i) => {
          let value = row[i] ? row[i].replace(/"/g, "").trim() : "";
          
          if (header === "Preço") {
            let cleanValue = value.replace("R$", "").replace(/\s/g, "").replace(",", ".");
            obj[header] = parseFloat(cleanValue) || 0;
          } else {
            obj[header] = value;
          }
        });
        return obj;
      })
      .filter(
        (p) => p["Disponível"]?.toLowerCase() !== "não" && p["Nome do Produto"]
      );

    renderProducts(allProducts);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    productsContainer.innerHTML =
      "<p>Erro ao carregar produtos. Verifique sua conexão.</p>";
  }
}

// 2. RENDERIZAÇÃO DOS CARDS DE PRODUTO
function renderProducts(products) {
    productsContainer.innerHTML = "";

    products.forEach((p) => {
        const card = document.createElement("div");
        card.className = "produto-card";

        // --- LÓGICA DE ESGOTADO (PARA TODOS OS ITENS) ---
        // Verifica se a coluna "Tamanho" OU "Disponível" contém a palavra "esgotado"
        const statusTamanho = (p["Tamanho"] || "").trim().toLowerCase();
        const statusDisponivel = (p["Disponível"] || "").trim().toLowerCase();
        
        // Se qualquer um dos campos for "esgotado", o item trava
        const isEsgotado = statusTamanho === "esgotado" || statusDisponivel === "não" || statusDisponivel === "esgotado";

        // Badges (Destaque / Lançamento)
        let destaqueBadge = "";
        const destaqueValue = (p["Destaque"] || "").trim().toLowerCase();
        if (destaqueValue === "sim") {
            destaqueBadge = `<span class="product-badge highlight">Destaque</span>`;
        } else if (destaqueValue === "lancamento" || destaqueValue === "lançamento") {
            destaqueBadge = `<span class="product-badge new">Lançamento</span>`;
        }

        // Verifica Categoria para mostrar grade de tamanhos (apenas se NÃO estiver esgotado)
        const categoriaNorm = normalizarParaBusca(p["Categoria"]);
        const isRoupa = categoriaNorm === "roupas" || categoriaNorm === "roupa";
        
        let tamanhosHtml = "";
        if (isEsgotado) {
            tamanhosHtml = `<div class="status-esgotado" style="color: #ff4d4d; font-weight: 700; margin-bottom: 10px;">Produto Esgotado</div>`;
        } else if (isRoupa && p["Tamanho"]) {
            const listaTamanhos = p["Tamanho"].split(",").map(t => t.trim());
            tamanhosHtml = `
                <div class="product-card-sizes">
                    ${listaTamanhos.map(t => `<span>${t}</span>`).join("")}
                </div>
            `;
        }

        // Ação do Botão
        let clickAction = "";
        let btnText = "";
        let btnClass = "add-carrinho";

        if (isEsgotado) {
            clickAction = ""; 
            btnText = "Indisponível";
            btnClass += " btn-indisponivel"; // Adiciona classe de estilo cinza
        } else {
            clickAction = isRoupa
                ? `openSizeSelector('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`
                : `addToCart('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`;
            btnText = isRoupa ? "Escolher Tamanho" : "Adicionar à Sacola";
        }

        card.innerHTML = `
            <div class="img-wrapper ${isEsgotado ? 'esgotado-overlay' : ''}"> 
                <img src="${p["Imagem"]}" alt="${p["Nome do Produto"]}" class="produto-img" loading="lazy">
                ${destaqueBadge}
                ${isEsgotado ? '<div class="sold-out-banner">ESGOTADO</div>' : ''}
            </div>
            <div class="produto-info">
                <span class="categoria-tag-card">${p["Categoria"]}</span>
                <h3>${p["Nome do Produto"]}</h3>
                ${p["ML"] ? `<p class="produto-ml">${p["ML"]}</p>` : ""}
                ${tamanhosHtml}
                <span class="preco">R$ ${p["Preço"].toFixed(2).replace(".", ",")}</span>
                <button class="${btnClass}" 
                        onclick="${clickAction}" 
                        ${isEsgotado ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}


// 3. LÓGICA DO CARRINHO
function addToCart(id, name, price, img) {
  const existingItem = cart.find((item) => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, img, quantity: 1 });
  }

  Toastify({
    text: "✅ Item adicionado à sacola!",
    duration: 1000,
    gravity: "bottom",
    position: "right",
    style: {
      background: "#8e5fb1",
      borderRadius: "12px",
      fontWeight: "600",
    },
  }).showToast();

  updateCart();
}

function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  cartCount.innerText = totalItems;
  cartItemsContainer.innerHTML = "";
  let totalValue = 0;

  cart.forEach((item) => {
    totalValue += item.price * item.quantity;
    const itemElement = document.createElement("div");
    itemElement.className = "cart-item";
    itemElement.innerHTML = `
            <img src="${item.img}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
            <div style="flex: 1;">
                <h4 style="font-size: 0.9rem;">${item.name}</h4>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <span style="font-weight: 700; color: #d4af37;">R$ ${item.price.toFixed(2).replace(".", ",")}</span>
                    <div style="display: flex; align-items: center; gap: 12px; background: #f4effa; padding: 6px 12px; border-radius: 50px;">
                        <button class="btn-qty" onclick="changeQuantity('${item.id}', -1)">-</button>
                        <span style="font-size: 1rem; font-weight:700; min-width: 20px; text-align: center;">${item.quantity}</span>
                        <button class="btn-qty" onclick="changeQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
    cartItemsContainer.appendChild(itemElement);
  });

  const formattedTotal = totalValue.toFixed(2).replace(".", ",");
  subtotalEl.innerText = `R$ ${formattedTotal}`;
  cartTotal.innerText = `R$ ${formattedTotal}`;
}

function changeQuantity(id, delta) {
  const item = cart.find((item) => item.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.id !== id);
    }
  }
  updateCart();
}

// 4. FILTROS POR CATEGORIA (CORRIGIDO PARA IGNORAR ACENTOS)
document.addEventListener("click", (e) => {
  const button = e.target.closest(".filtro-btn");

  if (button) {
    button.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

    document.querySelectorAll(".filtro-btn").forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const categoriaAlvo = normalizarParaBusca(button.getAttribute("data-categoria"));
    
    if (categoriaAlvo === "todos") {
      renderProducts(allProducts);
    } else {
      const filtered = allProducts.filter(
        (p) => normalizarParaBusca(p["Categoria"]) === categoriaAlvo
      );
      renderProducts(filtered);
    }
  }
});

// 5. FINALIZAÇÃO VIA WHATSAPP
document.getElementById("checkout-btn").addEventListener("click", () => {
    if (cart.length === 0) return;

    const address = addressInput.value.trim();
    if (!address) {
        addressInput.style.borderColor = "#ef4444";
        Toastify({
            text: "⚠️ Por favor, informe o endereço!",
            style: { background: "#ef4444" },
        }).showToast();
        return;
    }

    const cartItemsMsg = cart
        .map((i) => {
            const nomeFormatado = i.name.replace('(', '\n   *↳ Opção:* _').replace(')', '_');
            return `*${i.quantity}x* ${nomeFormatado}`;
        })
        .join("\n\n");

    const total = cartTotal.innerText;
    const message = encodeURIComponent(
        `*NOVO PEDIDO - DOMINC SPORT FITNESS*\n` +
        `------------------------------------------\n\n` +
        `*ITENS DO PEDIDO:*\n${cartItemsMsg}\n\n` +
        `------------------------------------------\n` +
        `*TOTAL:* ${total}\n` +
        `*ENDEREÇO:* ${address}\n\n` +
        `_Aguardando confirmação de pagamento via Pix ou Cartão._`
    );

    window.open(`https://wa.me/5588999049636?text=${message}`);
    cart = [];
    updateCart();
    cartModal.style.display = "none";
    addressInput.value = "";
    
    Toastify({
        text: "Pedido enviado com sucesso!",
        style: { background: "#4caf50" },
    }).showToast();
});

// 6. EVENTOS DE INTERFACE
document.getElementById("cart-btn").onclick = () => (cartModal.style.display = "flex");
document.getElementById("close-modal-btn").onclick = () => (cartModal.style.display = "none");

window.onclick = (event) => {
  if (event.target === cartModal) cartModal.style.display = "none";
};

// LIMPEZA ÚNICA DO CARRINHO
const clearCartBtn = document.getElementById("clear-cart-btn");
if (clearCartBtn) {
  clearCartBtn.replaceWith(clearCartBtn.cloneNode(true));
  const newClearBtn = document.getElementById("clear-cart-btn");
  newClearBtn.addEventListener("click", () => {
    if (cart.length === 0) {
      Toastify({ text: "O carrinho já está vazio!", duration: 1000, style: { background: "#333" } }).showToast();
      return;
    }
    if (confirm("Deseja remover todos os itens do seu carrinho?")) {
      cart = [];
      updateCart();
      Toastify({ text: "Carrinho esvaziado!", duration: 1000, style: { background: "#ef4444" } }).showToast();
    }
  });
}

// Inicializa o banner de novidades
const slimSwiper = new Swiper(".slimSwiper", {
  direction: "vertical",
  loop: true,
  autoplay: { delay: 3500, disableOnInteraction: false },
  pagination: { el: ".slim-pagination", clickable: true },
});

// INICIALIZAÇÃO AO CARREGAR A PÁGINA
window.onload = () => {
  loadProducts();
  updateCart();
};