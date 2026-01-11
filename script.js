// CONFIGURAÇÕES GERAIS
// const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?output=csv";

const VIDEO_ROTATION_TIME = 1000; // 4 ms)
let videoPlaylist = [];
let currentVideoIndex = 0;
let videoTimer = null;


const PRODUCTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?output=csv";

const BANNERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=1567682937&single=true&output=csv";

const VIDEOS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS81c2V8WFE0NbViXmuT-5k2kv78BUDgIT_nY7wDjOVYN078GJmpBlo_3SUrntbu0g72I0AV37-NnYF/pub?gid=2088601138&single=true&output=csv";

const productsContainer = document.getElementById("produtos-container");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const addressInput = document.getElementById("address");

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let tempProduct = null;
let selectedColor = "";

// --- FUNÇÃO PARA IGNORAR ACENTOS ---
function normalizarParaBusca(texto) {
  if (!texto) return "";
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --- CARREGAMENTO DE PRODUTOS ---
async function loadProducts() {
  try {
    const response = await fetch(PRODUCTS_CSV_URL);

    const data = await response.text();

    const rows = data
      .split(/\r?\n/)
      .filter((row) => row.trim() !== "")
      .map((row) => {
        return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      });

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
    console.error("Erro:", error);
    productsContainer.innerHTML =
      "<p class='col-span-full text-center py-10'>Erro ao carregar produtos.</p>";
  }
}

// --- RENDERIZAÇÃO DOS CARDS (TAILWIND) ---
function renderProducts(products) {
  productsContainer.innerHTML = "";

  products.forEach((p) => {
    const statusTamanho = (p["Tamanho"] || "").trim().toLowerCase();
    const statusDisponivel = (p["Disponível"] || "").trim().toLowerCase();
    const isEsgotado =
      statusTamanho === "esgotado" ||
      statusDisponivel === "não" ||
      statusDisponivel === "esgotado";
    const categoriaNorm = normalizarParaBusca(p["Categoria"]);
    const isRoupa = categoriaNorm === "roupas" || categoriaNorm === "roupa";

    // Lógica de Botão
    let clickAction = isEsgotado
      ? ""
      : isRoupa
      ? `openSizeSelector('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`
      : `addToCart('${p["ID"]}', '${p["Nome do Produto"]}', ${p["Preço"]}, '${p["Imagem"]}')`;

    let btnText = isEsgotado
      ? "Esgotado"
      : isRoupa
      ? "Escolher Tamanho"
      : "Adicionar";

    const card = document.createElement("div");
    card.className =
      "bg-white rounded-3xl overflow-hidden border border-slate-100 group hover:shadow-xl transition-all duration-300 flex flex-col h-full";

    card.innerHTML = `
            <div class="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                <img src="${
                  p["Imagem"]
                }" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 ${
      isEsgotado ? "grayscale opacity-50" : ""
    }">
                ${
                  isEsgotado
                    ? '<div class="absolute inset-0 flex items-center justify-center font-black text-red-500 uppercase tracking-widest text-sm bg-white/40 backdrop-blur-[2px]">Esgotado</div>'
                    : ""
                }
            </div>
            <div class="p-4 flex flex-col flex-1">
                <span class="text-[10px] font-bold text-accent uppercase tracking-tighter mb-1">${
                  p["Categoria"]
                }</span>
                <h3 class="font-bold text-sm text-textDark leading-tight mb-2 h-10 overflow-hidden">${
                  p["Nome do Produto"]
                }</h3>
                <div class="mt-auto">
                    <p class="text-lg font-black text-primary mb-3">R$ ${p[
                      "Preço"
                    ]
                      .toFixed(2)
                      .replace(".", ",")}</p>
                    <button onclick="${clickAction}" ${
      isEsgotado ? "disabled" : ""
    } 
                        class="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition 
                        ${
                          isEsgotado
                            ? "bg-slate-100 text-slate-400"
                            : "bg-primary text-white hover:bg-accent hover:shadow-md"
                        }">
                        ${btnText}
                    </button>
                </div>
            </div>
        `;
    productsContainer.appendChild(card);
  });
}

// --- LÓGICA DO CARRINHO ---
function addToCart(id, name, price, img) {
  const existingItem = cart.find((item) => item.id === id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, img, quantity: 1 });
  }
  updateCart();
  Toastify({
    text: "✅ Adicionado à sacola!",
    duration: 1500,
    style: { background: "#8e5fb1", borderRadius: "10px" },
  }).showToast();
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
                    <span class="font-bold text-primary text-sm">R$ ${item.price.toFixed(
                      2
                    )}</span>
                    <div class="flex items-center gap-3 bg-white px-3 py-1 rounded-full border border-slate-200">
                        <button onclick="changeQty('${
                          item.id
                        }', -1)" class="font-bold text-primary">-</button>
                        <span class="text-xs font-black">${item.quantity}</span>
                        <button onclick="changeQty('${
                          item.id
                        }', 1)" class="font-bold text-primary">+</button>
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
  addToCart(
    `${tempProduct.id}-${selectedColor}-${size}`,
    finalName,
    tempProduct.price,
    tempProduct.img
  );
  closeSizeModal();
}

function closeSizeModal() {
  document.getElementById("size-modal").classList.add("hidden");
  document.getElementById("color-step").classList.remove("hidden");
  document.getElementById("size-step").classList.add("hidden");
}

// --- FILTROS ATUALIZADOS E CORRIGIDOS ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-btn");
  if (btn) {
    // 1. Visual: Troca a cor do botão ativo
    document
      .querySelectorAll(".filtro-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Pegamos a categoria do botão (garrafas, acessorios, etc)
    const categoriaSelecionada = normalizarParaBusca(btn.dataset.categoria);

    // 2. Lógica de Filtro
    if (categoriaSelecionada === "todos") {
      renderProducts(allProducts);
    } else {
      const filtered = allProducts.filter((p) => {
        const catProduto = normalizarParaBusca(p["Categoria"]);

        // Regra especial para Garrafas (aceita termica, garrafa, garrafas)
        if (categoriaSelecionada === "garrafas") {
          return (
            catProduto.includes("garrafa") || catProduto.includes("termica")
          );
        }

        // Regra para Acessórios e Roupas (comparação direta normalizada)
        // Isso fará "acessorios" (botão) bater com "Acessórios" (planilha)
        return catProduto === categoriaSelecionada;
      });
      renderProducts(filtered);
    }

    // 3. Scroll suave
    document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
  }
});

// --- BUSCA ---

document.getElementById("search-input").addEventListener("input", (e) => {
  const term = normalizarParaBusca(e.target.value);
  const filtered = allProducts.filter((p) => {
    const nome = normalizarParaBusca(p["Nome do Produto"]);
    const cat = normalizarParaBusca(p["Categoria"]);
    return nome.includes(term) || cat.includes(term);
  });
  renderProducts(filtered);
});

// --- WHATSAPP ---
document.getElementById("checkout-btn").onclick = () => {
  if (cart.length === 0 || !addressInput.value)
    return alert("Carrinho vazio ou falta endereço!");
  const msg = encodeURIComponent(
    `*NOVO PEDIDO*\n${cart
      .map((i) => `${i.quantity}x ${i.name}`)
      .join("\n")}\n\n*TOTAL:* ${cartTotal.innerText}\n*ENDEREÇO:* ${
      addressInput.value
    }`
  );
  window.open(`https://wa.me/5588999049636?text=${msg}`);
};

// --- INICIALIZAÇÃO ---
// Substitua o bloco de inicialização por este:
document.getElementById("cart-btn").onclick = () => {
  cartModal.classList.remove("hidden");
  cartModal.classList.add("flex");
};

document.getElementById("close-modal-btn").onclick = () => {
  cartModal.classList.add("hidden");
  cartModal.classList.remove("flex");
};

// --- CARREGAMENTO DO VÍDEO HERO VIA GOOGLE SHEETS ---
async function carregarVideoHero() {
    try {
        const response = await fetch(VIDEOS_CSV_URL);
        const data = await response.text();

        const rows = data
            .split(/\r?\n/)
            .filter(r => r.trim())
            .map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

        if (rows.length < 2) return;

        const headers = rows[0].map(h => h.replace(/"/g, "").trim());
        const videos = rows.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => {
                obj[h] = row[i]?.replace(/"/g, "").trim();
            });
            return obj;
        });

        const ativo = videos.find(v => v.ativo === "TRUE" && v.tipo === "mp4");
        if (!ativo) return;

        const video = document.getElementById("hero-video");

        video.innerHTML = `<source src="${ativo.video_url}" type="video/mp4">`;

        if (ativo.poster) {
            video.setAttribute("poster", ativo.poster);
        }

        video.load();
    } catch (e) {
        console.error("Erro ao carregar vídeo:", e);
    }
}


function renderVideo(video) {
    const container = document.getElementById("hero-video-container");
    container.innerHTML = "";

    // YOUTUBE
    if (video.tipo === "youtube") {
        const id = extrairYoutubeID(video.video_url);

        container.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1"
                class="w-full h-full object-cover"
                frameborder="0"
                allow="autoplay; fullscreen"
                allowfullscreen>
            </iframe>
        `;
    }

    // MP4 / WEBM / OGG
    if (video.tipo === "mp4") {
        const ext = video.video_url.split('.').pop().toLowerCase();
        let type = "video/mp4";
        if (ext === "webm") type = "video/webm";
        if (ext === "ogg") type = "video/ogg";

        container.innerHTML = `
            <video autoplay muted loop playsinline class="w-full h-full object-cover"
                ${video.poster ? `poster="${video.poster}"` : ""}>
                <source src="${video.video_url}" type="${type}">
            </video>
        `;
    }
}
function iniciarRotacaoVideos() {
    clearInterval(videoTimer);

    videoTimer = setInterval(() => {
        currentVideoIndex++;
        if (currentVideoIndex >= videoPlaylist.length) {
            currentVideoIndex = 0;
        }
        renderVideo(videoPlaylist[currentVideoIndex]);
    }, VIDEO_ROTATION_TIME);
}


function extrairYoutubeID(url) {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/;
    const match = url.match(regex);
    return match ? match[1] : "";
}

async function carregarBanners() {
  const response = await fetch(BANNERS_CSV_URL);
  const data = await response.text();

  const rows = data
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

  const swiperWrapper = document.querySelector(".slimSwiper .swiper-wrapper");
  swiperWrapper.innerHTML = "";

  rows.slice(1).forEach((row) => {
    const [tag, titulo, descricao, botaoTexto, botaoLink, ativo] = row.map(
      (v) => v.replace(/"/g, "").trim()
    );

    if (ativo !== "TRUE") return;

    const slide = document.createElement("div");
    slide.className =
      "swiper-slide flex flex-col justify-center h-full pb-8 md:pb-0";

    slide.innerHTML = `
      <span class="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2 block">${tag}</span>
      <h2 class="text-2xl md:text-4xl font-black text-primary leading-[1.1] mb-4">${titulo}</h2>
      <p class="text-sm text-textMuted mb-8 max-w-md">${descricao}</p>
      <a href="${botaoLink}"
         class="inline-block bg-primary text-white px-10 py-4 rounded-full font-bold text-sm w-fit hover:bg-accent transition-all shadow-xl shadow-primary/20">
         ${botaoTexto}
      </a>
    `;

    swiperWrapper.appendChild(slide);
  });

  // 🔥 Swiper inicializado UMA ÚNICA VEZ
  new Swiper(".slimSwiper", {
    loop: true,
    autoHeight: true,
    spaceBetween: 30,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    observer: true,
    observeParents: true,
  });
}

window.onload = () => {
  loadProducts();
  updateCart();
  carregarBanners();
  carregarVideoHero(); // 👈 ADICIONADO
};
