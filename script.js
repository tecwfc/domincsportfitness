// CONFIGURAÇÕES GERAIS
const destaquesContainer = document.getElementById("destaques-container");
const productsContainer = document.getElementById("produtos-container");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const addressInput = document.getElementById("address");

const PRODUCTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=1588150896&single=true&output=csv";

const BANNERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=2088601138&single=true&output=csv";

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let tempProduct = null;
let selectedColor = "";

let destaquesSwiperInstance = null;
let heroSwiperInstance = null;

// --- NORMALIZAÇÃO DE ACENTOS ---
function normalizarParaBusca(texto) {
  if (!texto) return "";
  return texto.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// --- FUNÇÕES DE IMAGEM DO DRIVE ---
function driveImg(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  return `https://lh3.googleusercontent.com/d/${match[1]}=w1000`;
}

function converterDriveParaImagem(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  return `https://lh3.googleusercontent.com/d/${match[1]}=w2000`;
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
    allProducts = rows.slice(1).map((row) => {
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
    }).filter((p) => p["Disponível"]?.toLowerCase() !== "não" && p["Nome do Produto"]);

    renderProducts(allProducts);
    renderDestaques(allProducts);
  } catch (error) {
    console.error("Erro:", error);
    productsContainer.innerHTML = "<p class='col-span-full text-center py-10'>Erro ao carregar produtos.</p>";
  }
}

// --- RENDERIZAÇÃO DE DESTAQUES ---
function renderDestaques(products) {
  if (!destaquesContainer) return;
  const secaoDestaques = document.getElementById("destaques");

  const destaques = products
    .filter(
      (p) =>
        p["Destaque"]?.toLowerCase() === "sim" &&
        (p["Disponível"] || "").toLowerCase() !== "não" &&
        (p["Tamanho"] || "").toLowerCase() !== "esgotado"
    )
    .slice(0, 12);

  if (destaques.length === 0 && secaoDestaques) {
    secaoDestaques.classList.add("hidden");
    return;
  }

  destaquesContainer.innerHTML = "";

  destaques.forEach((p) => {
    const categoriaNorm = normalizarParaBusca(p["Categoria"]);
    const isRoupa = categoriaNorm === "roupas" || categoriaNorm === "roupa";

    let clickAction = isRoupa
      ? `openSizeSelector('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`
      : `addToCart('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`;

    let btnText = isRoupa ? "Escolher Tamanho" : "Adicionar";

    const slide = document.createElement("div");
    slide.className = "swiper-slide flex justify-center";

    slide.innerHTML = `
      <div class="bg-white rounded-3xl overflow-hidden border-2 border-accent shadow-lg flex flex-col max-w-xs w-full">
  <!-- Imagem menor -->
  <div class="relative h-48 bg-slate-50 flex items-center justify-center">
    <img src="${driveImg(p["Imagem"])}" class="max-h-full max-w-full object-contain transition duration-500"/>
    <span class="absolute top-3 left-3 bg-accent text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
      Destaque
    </span>
  </div>

  <!-- Conteúdo -->
  <div class="p-4 flex flex-col gap-1">
    <span class="text-[10px] font-bold text-accent uppercase">${p["Categoria"]}</span>
    <h3 class="font-bold text-sm text-textDark leading-snug">
      ${p["Nome do Produto"]}
    </h3>
    ${p["ML"] ? `<p class="text-xs text-textMuted">${p["ML"]}</p>` : ""}
    <p class="text-lg font-black text-primary mt-2">
      R$ ${p["Preço"].toFixed(2).replace(".", ",")}
    </p>
    <button onclick="${clickAction}" class="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition bg-primary text-white hover:bg-accent">
      ${btnText}
    </button>
  </div>
</div>
</div>
    `;

    destaquesContainer.appendChild(slide);
  });

  // Inicializa ou atualiza o Swiper
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
    const statusTamanho = (p["Tamanho"] || "").trim().toLowerCase();
    const statusDisponivel = (p["Disponível"] || "").trim().toLowerCase();
    const isEsgotado = statusTamanho === "esgotado" || statusDisponivel === "não" || statusDisponivel === "esgotado";
    const categoriaNorm = normalizarParaBusca(p["Categoria"]);
    const isRoupa = categoriaNorm === "roupas" || categoriaNorm === "roupa";

    let clickAction = isEsgotado ? "" : isRoupa
      ? `openSizeSelector('${p["ID"]}','${p["Nome do Produto"]}',${p["Preço"]},'${p["Imagem"]}')`
      : `addToCart('${p["ID"]}','${p["Nome do Produto"]}',${p["Preço"]},'${p["Imagem"]}')`;
    let btnText = isEsgotado ? "Esgotado" : isRoupa ? "Escolher Tamanho" : "Adicionar";

    const card = document.createElement("div");
    card.className = "bg-white rounded-3xl overflow-hidden border border-slate-100 group hover:shadow-xl transition-all duration-300 flex flex-col h-full";
    card.innerHTML = `
      <div class="relative aspect-[4/5] bg-slate-50 overflow-hidden">
        <img src="${driveImg(p["Imagem"])}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 ${isEsgotado ? "grayscale opacity-50" : ""}">
        ${isEsgotado ? '<div class="absolute inset-0 flex items-center justify-center font-black text-red-500 uppercase tracking-widest text-sm bg-white/40 backdrop-blur-[2px]">Esgotado</div>' : ""}
      </div>
      <div class="p-4 flex flex-col flex-1">
        <span class="text-[10px] font-bold text-accent uppercase tracking-tighter mb-1">${p["Categoria"]}</span>
        <h3 class="font-bold text-sm text-textDark leading-tight mb-1 h-10 overflow-hidden">${p["Nome do Produto"]}</h3>
        ${p["ML"] ? `<p class="text-xs text-textMuted mb-2">${p["ML"]}</p>` : ""}
        <div class="mt-auto">
          <p class="text-lg font-black text-primary mb-3">R$ ${p["Preço"].toFixed(2).replace(".", ",")}</p>
          <button onclick="${clickAction}" ${isEsgotado ? "disabled" : ""} class="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition ${isEsgotado ? "bg-slate-100 text-slate-400" : "bg-primary text-white hover:bg-accent hover:shadow-md"}">${btnText}</button>
        </div>
      </div>
      
    `;
    productsContainer.appendChild(card);
  });
}


// --- CARRINHO ---
function addToCart(id, name, price, img) {
  const existingItem = cart.find((item) => item.id === id);
  if (existingItem) existingItem.quantity += 1;
  else cart.push({ id, name, price, img, quantity: 1 });
  updateCart();
  Toastify({ text: "✅ Adicionado à sacola!", duration: 1500, style: { background: "#8e5fb1", borderRadius: "10px" } }).showToast();
}

function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCount.innerText = cart.reduce((acc, item) => acc + item.quantity, 0);
  cartItemsContainer.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    total += item.price * item.quantity;
    const div = document.createElement("div");
    div.className = "flex items-center gap-4 bg-slate-50 p-3 rounded-2xl";
    div.innerHTML = `
      <img src="${item.img}" class="w-16 h-16 rounded-xl object-cover">
      <div class="flex-1">
        <h4 class="text-xs font-bold leading-tight">${item.name}</h4>
        <div class="flex justify-between items-center mt-2">
          <span class="font-bold text-primary text-sm">R$ ${item.price.toFixed(2)}</span>
          <div class="flex items-center gap-3 bg-white px-3 py-1 rounded-full border border-slate-200">
            <button onclick="changeQty('${item.id}', -1)" class="font-bold text-primary">-</button>
            <span class="text-xs font-black">${item.quantity}</span>
            <button onclick="changeQty('${item.id}', 1)" class="font-bold text-primary">+</button>
          </div>
        </div>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  cartTotal.innerText = `R$ ${total.toFixed(2).replace(".", ",")}`;
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter((i) => i.id !== id);
  }
  updateCart();
}

// --- MODAIS ---
function openSizeSelector(id, name, price, img) {
  tempProduct = { id, name, price, img };
  document.getElementById("size-product-name").innerText = name;
  document.getElementById("size-modal").classList.remove("hidden");
  document.getElementById("size-modal").classList.add("flex");
}

function selectColor(color) {
  selectedColor = color;
  document.getElementById("modal-step-title").innerText = "Tamanho";
  document.getElementById("color-step").classList.add("hidden");
  document.getElementById("size-step").classList.remove("hidden");
}

function finishSelection(size) {
  const finalName = `${tempProduct.name} (${selectedColor} / ${size})`;
  addToCart(`${tempProduct.id}-${selectedColor}-${size}`, finalName, tempProduct.price, tempProduct.img);
  closeSizeModal();
}

function closeSizeModal() {
  document.getElementById("size-modal").classList.add("hidden");
  document.getElementById("color-step").classList.remove("hidden");
  document.getElementById("size-step").classList.add("hidden");
}

// --- FILTROS ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-btn");
  if (!btn) return;
  document.querySelectorAll(".filtro-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const categoriaSelecionada = normalizarParaBusca(btn.dataset.categoria);
  if (categoriaSelecionada === "todos") renderProducts(allProducts);
  else {
    const filtered = allProducts.filter((p) => {
      const catProduto = normalizarParaBusca(p["Categoria"]);
      if (categoriaSelecionada === "garrafas") return catProduto.includes("garrafa") || catProduto.includes("termica");
      return catProduto === categoriaSelecionada;
    });
    renderProducts(filtered);
  }

  document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
});

// --- BUSCA ---
document.getElementById("search-input").addEventListener("input", (e) => {
  const term = normalizarParaBusca(e.target.value);
  const filtered = allProducts.filter((p) => {
    return normalizarParaBusca(p["Nome do Produto"]).includes(term) || normalizarParaBusca(p["Categoria"]).includes(term);
  });
  renderProducts(filtered);
});

// --- WHATSAPP ---
document.getElementById("checkout-btn").onclick = () => {
  if (cart.length === 0 || !addressInput.value) return alert("Carrinho vazio ou falta endereço!");
  const msg = encodeURIComponent(`*NOVO PEDIDO*\n${cart.map((i) => `${i.quantity}x ${i.name}`).join("\n")}\n\n*TOTAL:* ${cartTotal.innerText}\n*ENDEREÇO:* ${addressInput.value}`);
  window.open(`https://wa.me/5588999049636?text=${msg}`);
};

// --- MODAL CARRINHO ---
document.getElementById("cart-btn").onclick = () => { cartModal.classList.remove("hidden"); cartModal.classList.add("flex"); };
document.getElementById("close-modal-btn").onclick = () => { cartModal.classList.add("hidden"); cartModal.classList.remove("flex"); };

// --- BANNERS HERO ---
async function carregarBannerHero() {
  const response = await fetch(BANNERS_CSV_URL);
  const data = await response.text();
  const rows = data.split(/\r?\n/).filter((r) => r.trim()).map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
  const wrapper = document.querySelector(".heroSwiper .swiper-wrapper");
  wrapper.innerHTML = "";

  rows.slice(1).forEach((row) => {
    const [imgRaw, titulo, botaoTexto, botaoLink, ativo] = row.map((v) => v.replace(/"/g, "").trim());
    if (!["sim","true","1"].includes(ativo.toLowerCase())) return;

    const slide = document.createElement("div");
    slide.className = "swiper-slide relative";
    slide.innerHTML = `
      <img src="${converterDriveParaImagem(imgRaw)}" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative z-10 flex items-center h-full px-8">
        <div class="max-w-xl text-white">
          <h2 class="text-4xl md:text-6xl font-black mb-6">${titulo}</h2>
          <a href="${botaoLink}" class="inline-block bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition">${botaoTexto}</a>
        </div>
      </div>
    `;
    wrapper.appendChild(slide);
  });

  if (heroSwiperInstance) heroSwiperInstance.destroy(true,true);

  heroSwiperInstance = new Swiper(".heroSwiper", {
    loop: true,
    autoplay: { delay: 5000, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
  });
}

// --- INICIALIZAÇÃO ---
window.onload = () => {
  loadProducts();
  updateCart();
  carregarBannerHero();
};
