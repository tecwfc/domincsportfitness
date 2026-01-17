// CONFIGURAÇÕES GERAIS
const destaquesContainer = document.getElementById("destaques-container");
const productsContainer = document.getElementById("produtos-container");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const addressInput = document.getElementById("address");

// Definições globais
let subtotal = 0;
const FRETE_GRATIS_VALOR = 200.0;
const TAXA_FRETE = 10.0;

const PRODUCTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=1588150896&single=true&output=csv";
const BANNERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=2088601138&single=true&output=csv";
const ESTOQUE_API_URL =
  "https://script.google.com/macros/s/AKfycbyPYMCLYiUi8TRsC0KYd1amFtezDYTwxtAajZsi5kiEV5vQTWOHK6IFbg1jpz3lX9K8/exec";

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let tempProduct = null;
let selectedColor = "";

let destaquesSwiperInstance = null;
let heroSwiperInstance = null;

// --- NORMALIZAÇÃO DE ACENTOS ---
function normalizarParaBusca(texto) {
  if (!texto) return "";
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --- FUNÇÕES DE IMAGEM DO DRIVE (CORRIGIDAS) ---
function driveImg(url) {
  if (!url) return "https://via.placeholder.com/400";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  // A sintaxe correta usa o símbolo de cifrão antes da chave
  return `https://lh3.googleusercontent.com/u/0/d/${match[1]}=w1000`;
}

function converterDriveParaImagem(url) {
  return driveImg(url);
}

// --- ATUALIZAÇÃO DO CARRINHO ---
function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCount.innerText = cart.reduce((total, item) => total + item.quantity, 0);
  cartItemsContainer.innerHTML = "";
  subtotal = 0;

  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 bg-white p-2 rounded-2xl mb-2 border border-slate-100 shadow-sm";

    div.innerHTML = `
            <img src="${driveImg(
              item.img
            )}" class="w-14 h-14 rounded-xl object-cover bg-slate-50 flex-shrink-0">
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <h4 class="text-[11px] font-bold text-slate-700 leading-tight truncate mb-0.5">${
                  item.name
                }</h4>
                <div class="flex items-center justify-between">
                    <p class="font-black text-primary text-xs">R$ ${item.price
                      .toFixed(2)
                      .replace(".", ",")}</p>
                    <div class="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <button onclick="changeQty('${
                          item.id
                        }', -1)" class="text-[10px] font-bold text-primary px-1">-</button>
                        <span class="text-[10px] font-black min-w-[10px] text-center">${
                          item.quantity
                        }</span>
                        <button onclick="changeQty('${
                          item.id
                        }', 1)" class="text-[10px] font-bold text-primary px-1">+</button>
                    </div>
                </div>
            </div>`;
    cartItemsContainer.appendChild(div);
  });
  
   // --- Limpar Carrinho ---
  const clearCartBtn = document.getElementById("clear-cart-btn");
  if (clearCartBtn) {
    if (cart.length === 0) {
      clearCartBtn.classList.add("hidden");
    } else {
      clearCartBtn.classList.remove("hidden");
    }
  }
  // -------------------------------

  atualizarBarraFrete();
}

// --- BARRA DE FRETE E TOTAIS ---
function atualizarBarraFrete() {
  const totalElement = document.getElementById("cart-total");
  const subtotalElement = document.getElementById("cart-subtotal");
  const shippingElement = document.getElementById("cart-shipping");
  const bar = document.getElementById("free-shipping-bar");
  const text = document.getElementById("free-shipping-text");

  subtotalElement.innerText = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;

  if (subtotal >= FRETE_GRATIS_VALOR) {
    bar.style.width = "100%";
    text.innerHTML = "🎉 Parabéns! Você ganhou <strong>FRETE GRÁTIS</strong>";
    shippingElement.innerText = "GRÁTIS";
    totalElement.innerText = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
  } else {
    const percent = (subtotal / FRETE_GRATIS_VALOR) * 100;
    const faltam = FRETE_GRATIS_VALOR - subtotal;
    bar.style.width = `${percent}%`;
    text.innerHTML = `Faltam <strong>R$ ${faltam
      .toFixed(2)
      .replace(".", ",")}</strong> para Frete Grátis`;
    shippingElement.innerText = `R$ ${TAXA_FRETE.toFixed(2).replace(".", ",")}`;
    totalElement.innerText = `R$ ${(subtotal + TAXA_FRETE)
      .toFixed(2)
      .replace(".", ",")}`;
  }
}

// --- CARREGAMENTO DE PRODUTOS ---
async function loadProducts() {
  try {
    const response = await fetch(PRODUCTS_CSV_URL);
    const data = await response.text();
    const rows = data
      .split(/\r?\n/)
      .filter((row) => row.trim() !== "")
      .map((row) => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

    if (rows.length < 2) return;

    const headers = rows[0].map((h) => h.replace(/"/g, "").trim());
    allProducts = rows
      .slice(1)
      .map((row) => {
        let obj = {};
        headers.forEach((header, i) => {
          let value = row[i] ? row[i].replace(/"/g, "").trim() : "";
          if (header === "Preço") {
            let cleanValue = value
              .replace("R$", "")
              .replace(/\s/g, "")
              .replace(",", ".");
            obj[header] = parseFloat(cleanValue) || 0;
          } else if (header === "Saldo Estoque") {
            obj[header] = parseInt(value) || 0;
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
    renderDestaques(allProducts);
  } catch (error) {
    console.error("Erro:", error);
    productsContainer.innerHTML =
      "<p class='col-span-full text-center py-10'>Erro ao carregar produtos.</p>";
  }
}
// --- RENDERIZAÇÃO DE DESTAQUES ---
function renderDestaques(products) {
  if (!destaquesContainer) return;
  const secaoDestaques = document.getElementById("destaques");
  
  const destaques = products
    .filter((p) => {
      const estoque = parseInt(p["Saldo Estoque"]) || 0;
      return p["Destaque"]?.toLowerCase() === "sim" && estoque > 0;
    })
    .slice(0, 6);

  if (destaques.length === 0) {
    if (secaoDestaques) secaoDestaques.classList.add("hidden");
    return;
  } else {
    if (secaoDestaques) secaoDestaques.classList.remove("hidden");
  }

  destaquesContainer.innerHTML = "";
  destaques.forEach((p) => {
    const estoqueReal = parseInt(p["Saldo Estoque"]) || 0;
    const isUltimasUnidades = estoqueReal > 0 && estoqueReal <= 3; // Lógica de urgência

    const categoriaNorm = normalizarParaBusca(p["Categoria"]);
    const isRoupa = categoriaNorm === "feminino" || categoriaNorm === "masculino";
    
    let clickAction = isRoupa
      ? `openSizeSelector('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`
      : `addToCart('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`;
    let btnText = isRoupa ? "Escolher Tamanho" : "Adicionar";

    const slide = document.createElement("div");
    slide.className = "swiper-slide flex justify-center";
    slide.innerHTML = `
    <div class="bg-white rounded-3xl overflow-hidden border-2 border-accent shadow-lg flex flex-col max-w-xs w-full relative">
        <div class="relative h-48 bg-slate-50 flex items-center justify-center">
            <img src="${driveImg(p["Imagem"])}" class="max-h-full max-w-full object-contain transition duration-500"/>
            
            <span class="absolute top-3 left-3 bg-accent text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Destaque</span>
            
            ${isUltimasUnidades 
                ? '<span class="absolute bottom-3 right-3 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse uppercase z-10">Últimas Unidades</span>' 
                : ""
            }
        </div>
        <div class="p-4 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-accent uppercase">${p["Categoria"]}</span>
            <h3 class="font-bold text-sm text-textDark leading-snug h-10 overflow-hidden">${p["Nome do Produto"]}</h3>
            
            <p class="text-[10px] font-bold ${isUltimasUnidades ? "text-orange-500" : "text-green-600"}">
                ${isUltimasUnidades ? `Resta(m) apenas ${estoqueReal}!` : `Em estoque: ${estoqueReal}`}
            </p>

            <p class="text-lg font-black text-primary mt-1">R$ ${p["Preço"].toFixed(2).replace(".", ",")}</p>
            <button onclick="${clickAction}" class="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition bg-primary text-white hover:bg-accent">${btnText}</button>
        </div>
    </div>`;
    destaquesContainer.appendChild(slide);
  });

  if (destaquesSwiperInstance) destaquesSwiperInstance.destroy(true, true);
  destaquesSwiperInstance = new Swiper(".destaquesSwiper", {
    slidesPerView: 2,
    spaceBetween: 16,
    breakpoints: { 640: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } },
    navigation: { nextEl: ".destaque-next", prevEl: ".destaque-prev" },
  });
}


// --- RENDERIZAÇÃO DE PRODUTOS ---
function renderProducts(products) {
  productsContainer.innerHTML = "";
  products.forEach((p) => {
    const estoqueReal = parseInt(p["Saldo Estoque"]) || 0;
    const statusDisponivel = (p["Disponível"] || "").trim().toLowerCase();
    const isEsgotado = estoqueReal <= 0 || statusDisponivel === "esgotado";
    
    // NOVO: Gatilho de urgência para estoque baixo
    const isUltimasUnidades = estoqueReal > 0 && estoqueReal <= 3;

    const categoriaNorm = normalizarParaBusca(p["Categoria"]);
    const isRoupa = categoriaNorm.includes("feminino") || categoriaNorm.includes("masculino");
    
    let clickAction = isEsgotado
      ? ""
      : isRoupa
      ? `openSizeSelector('${p["ID"]}','${p["Nome do Produto"]}',${p["Preço"]},'${p["Imagem"]}')`
      : `addToCart('${p["ID"]}','${p["Nome do Produto"]}',${p["Preço"]},'${p["Imagem"]}')`;
    
    let btnText = isEsgotado ? "Esgotado" : isRoupa ? "Escolher Tamanho" : "Adicionar";

    // Localize este trecho dentro de renderProducts:

const card = document.createElement("div");
card.className = "bg-white rounded-3xl overflow-hidden border border-slate-100 group hover:shadow-xl transition-all duration-300 flex flex-col h-full relative";

card.innerHTML = `
    <div class="relative aspect-[4/5] bg-slate-50 overflow-hidden">
        <img src="${driveImg(p["Imagem"])}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 ${isEsgotado ? "grayscale opacity-50" : ""}">
        
        ${isEsgotado 
            ? '<div class="absolute inset-0 flex items-center justify-center font-black text-red-500 uppercase tracking-widest text-sm bg-white/40 backdrop-blur-[2px]">Esgotado</div>' 
            : isUltimasUnidades 
            ? '<div class="absolute bottom-3 right-3 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse uppercase z-10">Últimas Unidades</div>'
            : ""
        }
    </div>
    <div class="p-4 flex flex-col flex-1">
        <span class="text-[10px] font-bold text-accent uppercase tracking-tighter mb-1">${p["Categoria"]}</span>
        <h3 class="font-bold text-sm text-textDark leading-tight mb-1 h-10 overflow-hidden">${p["Nome do Produto"]}</h3>
        <div class="mt-auto">
            <p class="text-xs font-bold ${isEsgotado ? "text-red-500" : isUltimasUnidades ? "text-orange-500" : "text-green-600"} mb-1">
                ${isEsgotado ? "Indisponível" : isUltimasUnidades ? `Corra! Apenas ${estoqueReal} em estoque` : "Em estoque: " + estoqueReal}
            </p>
            <p class="text-lg font-black text-primary mb-3">R$ ${p["Preço"].toFixed(2).replace(".", ",")}</p>
            <button onclick="${clickAction}" ${isEsgotado ? "disabled" : ""} 
                class="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition ${
                    isEsgotado ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-primary text-white hover:bg-accent hover:shadow-md"
                }">${btnText}</button>
        </div>
    </div>`;

    productsContainer.appendChild(card);
  });
}

// --- FUNÇÃO PARA ADICIONAR AO CARRINHO ---
function addToCart(id, name, price, img) {
  // 1. Encontrar o saldo original do produto (pegamos apenas a parte numérica do ID antes do hífen)
  const baseId = id.toString().split("-")[0];
  const originalProduct = allProducts.find(p => p["ID"].toString() === baseId);
  const estoqueDisponivel = originalProduct ? parseInt(originalProduct["Saldo Estoque"]) : 0;

  // 2. Verificar quanto já existe desse item no carrinho
  const existingItem = cart.find((item) => item.id === id);
  const quantidadeNoCarrinho = existingItem ? existingItem.quantity : 0;

  // 3. Validar se pode adicionar mais um
  if (quantidadeNoCarrinho >= estoqueDisponivel) {
    Toastify({
      text: `Ops! Temos apenas ${estoqueDisponivel} unidade(s) em estoque.`,
      duration: 3000,
      gravity: "bottom",
      position: "right",
      style: { background: "#ef4444", borderRadius: "12px" },
    }).showToast();
    return; // Interrompe a função aqui
  }

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, img, quantity: 1 });
  }

  Toastify({
    text: `${name} adicionado à sacola!`,
    duration: 2000,
    gravity: "bottom",
    position: "right",
    style: { background: "#8e5fb1", borderRadius: "12px" },
  }).showToast();

  updateCart();
}

// --- Lógica de Frete e Totais (Visual otimizado) ---
const bar = document.getElementById("free-shipping-bar");
const text = document.getElementById("free-shipping-text");
const freteEl = document.getElementById("cart-shipping");
let freteFinal = 0;

if (subtotal === 0) {
  if (bar) bar.style.width = "0%";
  if (text) text.innerText = `Frete grátis acima de R$ ${FRETE_GRATIS_VALOR}`;
  freteFinal = 0;
} else if (subtotal < FRETE_GRATIS_VALOR) {
  const falta = FRETE_GRATIS_VALOR - subtotal;
  const porc = (subtotal / FRETE_GRATIS_VALOR) * 100;
  if (bar) bar.style.width = porc + "%";
  // Texto de frete menor
  if (text)
    text.innerHTML = `<span class="text-[10px]">Faltam <span class="text-primary font-bold">R$ ${falta
      .toFixed(2)
      .replace(".", ",")}</span> para frete grátis</span>`;
  freteFinal = TAXA_FRETE;
} else {
  if (bar) bar.style.width = "100%";
  if (text)
    text.innerHTML = `<span class="text-green-600 text-[10px] font-bold">Frete Grátis Liberado!</span>`;
  freteFinal = 0;
}

const totalGeral = subtotal + freteFinal;

// Atualiza os campos de texto com fontes menores
const subtotalEl = document.getElementById("cart-subtotal");
if (subtotalEl)
  subtotalEl.innerText = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;

if (freteEl)
  freteEl.innerText =
    freteFinal === 0
      ? "GRÁTIS"
      : `R$ ${freteFinal.toFixed(2).replace(".", ",")}`;

cartTotal.innerText = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;

// ..(Função para o botão -ou + dentro do carrinho)

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  if (delta > 0) {
    // Validar estoque ao tentar aumentar a quantidade
    const baseId = id.toString().split("-")[0];
    const originalProduct = allProducts.find(p => p["ID"].toString() === baseId);
    const estoqueDisponivel = originalProduct ? parseInt(originalProduct["Saldo Estoque"]) : 0;

    if (item.quantity >= estoqueDisponivel) {
      Toastify({
        text: "Limite de estoque atingido!",
        duration: 2000,
        style: { background: "#fbbf24", color: "#000" },
      }).showToast();
      return;
    }
    item.quantity += 1;
  } else {
    // Diminuir quantidade
    item.quantity -= 1;
    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.id !== id);
    }
  }
  updateCart();
}

// ... (abaixo vem a função updateCart)

// --- MODAIS DE CORES E TAMANHOS ---
function openSizeSelector(id, name, price, img) {
  tempProduct = { id, name, price, img };
  document.getElementById("size-product-name").innerText = name;

  // Reseta o modal para o primeiro passo (Cores)
  document.getElementById("modal-step-title").innerText = "Selecione a Cor";
  document.getElementById("color-step").classList.remove("hidden");
  document.getElementById("size-step").classList.add("hidden");

  document.getElementById("size-modal").classList.remove("hidden");
  document.getElementById("size-modal").classList.add("flex");
}

function selectColor(color) {
  selectedColor = color;
  // Passa para o próximo passo (Tamanhos)
  document.getElementById("modal-step-title").innerText = "Selecione o Tamanho";
  document.getElementById("color-step").classList.add("hidden");
  document.getElementById("size-step").classList.remove("hidden");
}

function finishSelection(size) {
  if (tempProduct) {
    // Cria um ID único combinando ID+Cor+Tamanho para não misturar no carrinho
    const uniqueId = `${tempProduct.id}-${selectedColor}-${size}`;
    const fullName = `${tempProduct.name} (${selectedColor} / ${size})`;

    addToCart(uniqueId, fullName, tempProduct.price, tempProduct.img);
    closeSizeModal();
  }
}

function closeSizeModal() {
  document.getElementById("size-modal").classList.add("hidden");
  document.getElementById("color-step").classList.remove("hidden");
  document.getElementById("size-step").classList.add("hidden");
}

// --- FILTROS E BUSCA ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-btn");
  if (!btn) return;
  document
    .querySelectorAll(".filtro-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const categoriaSelecionada = normalizarParaBusca(btn.dataset.categoria);
  if (categoriaSelecionada === "todos") renderProducts(allProducts);
  else {
    const filtered = allProducts.filter((p) => {
      const catProduto = normalizarParaBusca(p["Categoria"]);
      return categoriaSelecionada === "garrafas"
        ? catProduto.includes("garrafa") || catProduto.includes("termica")
        : catProduto === categoriaSelecionada;
    });
    renderProducts(filtered);
  }
  document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
});

// --- WHATSAPP (CORREÇÃO FINAL AQUI) ---
// --- WHATSAPP (VERSÃO FINAL UNIFICADA) ---
document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkout-btn");

  if (checkoutBtn) {
    // Removemos qualquer onclick anterior para evitar duplicidade
    checkoutBtn.addEventListener("click", async () => {
      const address = document.getElementById("address").value;

      if (cart.length === 0) {
        alert("Sua sacola está vazia!");
        return;
      }

      if (!address || address.trim() === "") {
        alert("Por favor, informe o endereço!");
        document.getElementById("address").focus();
        return;
      }

      checkoutBtn.innerText = "PROCESSANDO...";
      checkoutBtn.disabled = true;

      try {
        const subtotalLocal = cart.reduce(
          (t, i) => t + i.price * i.quantity,
          0
        );
        const frete = subtotalLocal >= FRETE_GRATIS_VALOR ? 0 : TAXA_FRETE;
        const total = subtotalLocal + frete;

        // 1. Monta a lista de itens com quebra de linha real
        const itensTxt = cart
          .map((i) => `✅ *${i.quantity}x* ${i.name}`)
          .join("\n");

        // 2. Monta o corpo da mensagem usando Template Literals (crases)
        const textoMensagem = `*Olá, segue meu pedido da loja:* 🛍️

*📦 NOVO PEDIDO - DOMINC SPORT FITNESS*

*ITENS:*
${itensTxt}

--------------------------
*Subtotal:* R$ ${subtotalLocal.toFixed(2).replace(".", ",")}
*Frete:* ${frete === 0 ? "GRÁTIS" : "R$ " + frete.toFixed(2).replace(".", ",")}
*TOTAL: R$ ${total.toFixed(2).replace(".", ",")}*
--------------------------

*📍 ENDEREÇO:* ${address}`;

        // 3. Codifica a mensagem para o formato de URL
        const msgEncoded = encodeURIComponent(textoMensagem);

        // 4. Tenta atualizar o estoque via API (sem travar o fluxo)
        fetch(ESTOQUE_API_URL, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            items: cart.map((i) => ({
              id: i.id.toString().split("-")[0],
              quantity: i.quantity,
            })),
          }),
        }).catch((e) => console.error("Erro estoque:", e));

        // 5. Abre o WhatsApp com a API oficial (mais estável)
        const whatsappUrl = `https://api.whatsapp.com/send?phone=5588999565560&text=${msgEncoded}`;
        window.open(whatsappUrl, "_blank");

        // 6. Limpa o carrinho e fecha o modal
        cart = [];
        localStorage.removeItem("cart");
        updateCart();
        document.getElementById("address").value = "";
        cartModal.classList.add("hidden");
      } catch (error) {
        console.error(error);
        alert("Erro ao processar pedido.");
      } finally {
        checkoutBtn.innerText = "Finalizar no WhatsApp";
        checkoutBtn.disabled = false;
      }
    });
  }
});

// --- OUTROS EVENTOS ---
document.getElementById("cart-btn").onclick = () => {
  cartModal.classList.remove("hidden");
  cartModal.classList.add("flex");
};
document.getElementById("close-modal-btn").onclick = () => {
  cartModal.classList.add("hidden");
  cartModal.classList.remove("flex");
};

const confirmModal = document.getElementById("confirm-clear-modal");
document.getElementById("clear-cart-btn").onclick = () => {
  if (cart.length) confirmModal.classList.replace("hidden", "flex");
};
document.getElementById("cancel-clear-btn").onclick = () =>
  confirmModal.classList.replace("flex", "hidden");
document.getElementById("confirm-clear-btn").onclick = () => {
  cart = [];
  localStorage.removeItem("cart");
  updateCart();
  confirmModal.classList.replace("flex", "hidden");
};

async function carregarBannerHero() {
  const response = await fetch(BANNERS_CSV_URL);
  const data = await response.text();
  const rows = data
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
  const wrapper = document.querySelector(".heroSwiper .swiper-wrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";
  rows.slice(1).forEach((row) => {
    const [imgRaw, titulo, bTexto, bLink, ativo] = row.map((v) =>
      v.replace(/"/g, "").trim()
    );
    if (!["sim", "true", "1"].includes(ativo.toLowerCase())) return;
    const slide = document.createElement("div");
    slide.className = "swiper-slide relative";
    slide.innerHTML = `<img src="${converterDriveParaImagem(
      imgRaw
    )}" class="absolute inset-0 w-full h-full object-cover" /><div class="absolute inset-0 bg-black/40"></div><div class="relative z-10 flex items-center h-full px-8 text-white"><div class="max-w-xl"><h2 class="text-4xl md:text-6xl font-black mb-6">${titulo}</h2><a href="${bLink}" class="bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition">${bTexto}</a></div></div>`;
    wrapper.appendChild(slide);
  });
  new Swiper(".heroSwiper", {
    loop: true,
    autoplay: { delay: 5000 },
    pagination: { el: ".swiper-pagination", clickable: true },
  });
}

// Lógica para os botões de filtro do menu suspenso

document.querySelectorAll(".filtro-menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const categoriaAlvo = normalizarParaBusca(
      btn.getAttribute("data-categoria")
    );

    console.log("Filtrando por:", categoriaAlvo); // Para você testar no console F12

    let produtosFiltrados;

    if (categoriaAlvo === "todos") {
      produtosFiltrados = allProducts;
    } else {
      produtosFiltrados = allProducts.filter((p) => {
        const categoriaPlanilha = normalizarParaBusca(p["Categoria"]);

        // Lógica especial para garrafas (pega garrafa, térmica, etc)
        if (categoriaAlvo === "garrafas") {
          return (
            categoriaPlanilha.includes("garrafa") ||
            categoriaPlanilha.includes("termica")
          );
        }

        // Lógica para Feminino (pega se na planilha estiver 'roupa feminino' ou só 'feminino')
        if (categoriaAlvo === "feminino") {
          return categoriaPlanilha.includes("feminino");
        }

        // Lógica para Masculino
        if (categoriaAlvo === "masculino") {
          return categoriaPlanilha.includes("masculino");
        }

        // Para acessórios e outros (comparação flexível)
        return categoriaPlanilha.includes(categoriaAlvo);
      });
    }

    renderProducts(produtosFiltrados);

    // Rola para a seção de produtos
    const sectionProdutos = document.getElementById("produtos");
    if (sectionProdutos)
      sectionProdutos.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Busca em tempo real
const searchInputTop = document.getElementById("search-input-top");

if (searchInputTop) {
  searchInputTop.addEventListener("input", (e) => {
    const termo = normalizarParaBusca(e.target.value);

    const filtrados = allProducts.filter((p) => {
      const nome = normalizarParaBusca(p["Nome do Produto"]);
      const categoria = normalizarParaBusca(p["Categoria"]);
      return nome.includes(termo) || categoria.includes(termo);
    });

    renderProducts(filtrados);

    // Se o usuário começar a digitar, rola para a seção de produtos
    if (termo.length > 2) {
      const sectionBusca = document.getElementById("produtos");
      const y =
        sectionBusca.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });
}
// 1. Fechar ao clicar fora do modal
cartModal.addEventListener("click", (event) => {
  // Se o clique foi no fundo (cart-modal) e não no conteúdo branco
  if (event.target === cartModal) {
    cartModal.classList.remove("flex");
    cartModal.classList.add("hidden");
  }
});

// 2. Fechar ao apertar a tecla ESC
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cartModal.classList.contains("hidden")) {
    cartModal.classList.remove("flex");
    cartModal.classList.add("hidden");
  }
});

// Caso ainda não tenha no seu script.js
const closeModalBtn = document.getElementById("close-modal-btn");

closeModalBtn.addEventListener("click", () => {
  cartModal.classList.remove("flex");
  cartModal.classList.add("hidden");
});

window.onload = () => {
  loadProducts();
  carregarBannerHero(); // Certifique-se que esta função está sendo chamada
  updateCart();
};

// Fechar menu mobile ao clicar no link "Sobre"
const linkSobreMobile = document.getElementById("link-sobre-mobile");
if (linkSobreMobile) {
  linkSobreMobile.addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.add("translate-x-full");
    document.getElementById("mobile-overlay").classList.add("hidden");
  });
}

// Configuração do botão flutuante de suporte
const botaoFlutuante = document.getElementById("whatsapp-flutuante"); // Use o ID correto do seu botão

if (botaoFlutuante) {
  const saudacaoSuporte = encodeURIComponent(
    "Olá! Vi o site da DOMINC SPORT FITNESS e gostaria de tirar uma dúvida sobre um produto."
  );
  botaoFlutuante.href = `https://wa.me/5588999565560?text=${saudacaoSuporte}`;
}

// Localize onde você trata o clique nas categorias e use este padrão:
document.querySelectorAll(".filtro-menu-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const categoria = btn.getAttribute("data-categoria");

    // 1. Feedback visual (opcional)
    console.log("Filtrando por:", categoria);

    // 2. Se for mobile (menu aberto), fecha o menu
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileOverlay = document.getElementById("mobile-overlay");
    if (mobileMenu && !mobileMenu.classList.contains("translate-x-full")) {
      mobileMenu.classList.add("translate-x-full");
      mobileOverlay.classList.add("hidden");
    }

    // 3. Lógica de Filtro
    if (categoria === "todos") {
      renderProducts(allProducts);
    } else {
      const termoBusca = normalizarParaBusca(categoria);
      const filtrados = allProducts.filter((p) => {
        const catProd = normalizarParaBusca(p["Categoria"]);
        // Tratamento especial para garrafas como você já fez
        if (termoBusca === "garrafas") {
          return catProd.includes("garrafa") || catProd.includes("termica");
        }
        return catProd.includes(termoBusca);
      });
      renderProducts(filtrados);
    }

    // 4. Rola para a seção de produtos
    document
      .getElementById("produtos")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Elementos da Busca Mobile
const mobileSearchOpen = document.getElementById("mobile-search-open");
const mobileSearchClose = document.getElementById("mobile-search-close");
const searchOverlay = document.getElementById("search-overlay");
const searchInputMobile = document.getElementById("search-input-mobile");

// Abrir Busca
if (mobileSearchOpen) {
  mobileSearchOpen.addEventListener("click", () => {
    searchOverlay.classList.remove("-translate-y-full");
    searchInputMobile.focus(); // Foca no campo automaticamente
  });
}

// Fechar Busca
if (mobileSearchClose) {
  mobileSearchClose.addEventListener("click", () => {
    searchOverlay.classList.add("-translate-y-full");
    searchInputMobile.value = ""; // Limpa a busca ao fechar
  });
}

// Lógica de Busca em Tempo Real (Mobile)
if (searchInputMobile) {
  searchInputMobile.addEventListener("input", (e) => {
    const termo = normalizarParaBusca(e.target.value);

    const filtrados = allProducts.filter((p) => {
      const nome = normalizarParaBusca(p["Nome do Produto"]);
      const categoria = normalizarParaBusca(p["Categoria"]);
      return nome.includes(termo) || categoria.includes(termo);
    });

    renderProducts(filtrados);

    // Se o usuário digitar mais de 2 letras, rola para os produtos
    if (termo.length > 2) {
      const sectionMob = document.getElementById("produtos");
      const yMob =
        sectionMob.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: yMob, behavior: "smooth" });
    }
  });
}

// Abrir/Fechar Menu Mobile
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileOverlay = document.getElementById("mobile-overlay");
const closeMobileMenu = document.getElementById("close-mobile-menu");

if (mobileMenuBtn) {
  mobileMenuBtn.onclick = () => {
    mobileMenu.classList.remove("translate-x-full");
    mobileOverlay.classList.remove("hidden");
  };
}

if (closeMobileMenu || mobileOverlay) {
  const close = () => {
    mobileMenu.classList.add("translate-x-full");
    mobileOverlay.classList.add("hidden");
  };
  if (closeMobileMenu) closeMobileMenu.onclick = close;
  if (mobileOverlay) mobileOverlay.onclick = close;
}
