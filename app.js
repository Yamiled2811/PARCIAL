

const state = {
  events: [],
  filtered: [],
  view: localStorage.getItem('view') || 'grid',
  query: '',
  page: 1,
  perPage: 8
};

const els = {
  catalog: document.getElementById('catalog'),
  search: document.getElementById('search'),
  toggleView: document.getElementById('toggleView'),
  viewLabel: document.getElementById('viewLabel'),
  noResults: document.getElementById('noResults'),
  clearFilters: document.getElementById('clearFilters'),
  pagination: document.getElementById('pagination'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  catalogSection: document.getElementById('catalogSection'),
  detailEl: document.getElementById('detailView'),

  cartBtn: document.getElementById('cartBtn'),
  cartView: document.getElementById('cartView')
};

async function fetchEvents(){
  try{
    const res = await fetch('./data/events.json');
    if(!res.ok) throw new Error('Error al cargar events.json');
    state.events = await res.json();
  }catch(err){
    console.error(err);
    els.catalog.innerHTML = `<div class="empty">No se pudieron cargar los eventos. Usa un servidor local (Live Server o python -m http.server).</div>`;
  }
}

function applyFilters(){
  const q = state.query.trim().toLowerCase();
  state.filtered = state.events.filter(ev => {
    if(!q) return true;
    const hay = [ev.title, ...(ev.artists||[]), ev.city].join(' ').toLowerCase();
    return hay.includes(q);
  });
  state.page = 1;
}

function renderCatalog(){
  const start = (state.page - 1) * state.perPage;
  const end = start + state.perPage;
  const pageItems = state.filtered.slice(start, end);


  els.catalog.className = state.view === 'grid' ? 'grid' : 'list';
  els.viewLabel.textContent = state.view === 'grid' ? 'Grid' : 'Lista';
  els.toggleView.setAttribute('aria-pressed', state.view === 'list');
  localStorage.setItem('view', state.view);


  if(state.filtered.length === 0){
    els.noResults.hidden = false;
    els.catalog.innerHTML = '';
    els.pagination.hidden = true;
    return;
  } else {
    els.noResults.hidden = true;
  }

  els.catalog.innerHTML = '';
  for(const ev of pageItems){
    els.catalog.appendChild(createCard(ev));
  }

  const totalPages = Math.ceil(state.filtered.length / state.perPage);
  if(totalPages > 1){
    els.pagination.hidden = false;
    els.pageInfo.textContent = `${state.page} / ${totalPages}`;
    els.prevPage.disabled = state.page === 1;
    els.nextPage.disabled = state.page === totalPages;
  } else {
    els.pagination.hidden = true;
  }
}

function createCard(ev){
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('tabindex','0');

  const img = document.createElement('img');
  img.src = ev.images?.[0] || '';
  img.alt = ev.title + ' — ' + (ev.venue || ev.city);

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = ev.title;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const date = new Date(ev.datetime).toLocaleString();
  meta.textContent = `${ev.city} · ${date}`;

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = ev.priceFrom > 0 ? `Desde ${ev.currency} ${ev.priceFrom}` : 'Gratis';

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const detailLink = document.createElement('a');
  detailLink.href = `#/event/${ev.id}`;
  detailLink.textContent = 'Ver detalle';
  detailLink.setAttribute('aria-label', `Ver detalle de ${ev.title}`);
  detailLink.className = 'btn';

  actions.appendChild(detailLink);

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(price);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function attachEvents(){
  els.search.addEventListener('input', e => {
    state.query = e.target.value;
    applyFilters();
    renderCatalog();
  });

  els.toggleView.addEventListener('click', () => {
    state.view = state.view === 'grid' ? 'list' : 'grid';
    renderCatalog();
  });

  els.clearFilters.addEventListener('click', () => {
    state.query = '';
    els.search.value = '';
    applyFilters();
    renderCatalog();
  });

  els.prevPage.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderCatalog(); });
  els.nextPage.addEventListener('click', () => { const total = Math.ceil(state.filtered.length / state.perPage); state.page = Math.min(total, state.page + 1); renderCatalog(); });
  
  if(els.cartBtn){
    els.cartBtn.addEventListener('click', openCart);
  }
 
}


const storage = {
  get(key){ try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } },
  set(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
};

function isFavorited(id){ const fav = storage.get('favEvents'); return fav.includes(id); }
function toggleFavorite(id){ const fav = storage.get('favEvents'); const idx = fav.indexOf(id); if(idx === -1) fav.push(id); else fav.splice(idx,1); storage.set('favEvents', fav); }

function addToCart(item){ 
  const cart = storage.get('cart');
  const existing = cart.find(i=>i.id===item.id);
  if(existing){
    existing.qty = Math.min(existing.qty + item.qty, item.max);
  } else {
    cart.push({id:item.id, qty:item.qty});
  }
  storage.set('cart', cart);
}


function openDetail(id){
  const ev = state.events.find(e=>e.id===id);
  if(!ev) return alert('Evento no encontrado');


  els.catalogSection.hidden = true;
  els.detailEl.hidden = false;
  els.detailEl.setAttribute('aria-hidden','false');
  els.detailEl.innerHTML = buildDetailHTML(ev);
  attachDetailEvents(ev);
  const prevBtn = detailEl.querySelector('#prevImg');
  const nextBtn = detailEl.querySelector('#nextImg');
  let currentIdx = 0;

  function showImg(idx){
    const imgs = ev.images;
    if(idx<0) idx = imgs.length-1;
    if(idx>=imgs.length) idx = 0;
    currentIdx = idx;
    mainImg.src = imgs[idx];
    mainImg.dataset.idx = idx;
    thumbs.forEach(x=>x.removeAttribute('aria-selected'));
    const thumb = thumbs.find(t=>t.dataset.idx==idx);
    if(thumb) thumb.setAttribute('aria-selected','true');
  }

  prevBtn.addEventListener('click', ()=> showImg(currentIdx-1));
  nextBtn.addEventListener('click', ()=> showImg(currentIdx+1));


  detailEl.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowLeft') showImg(currentIdx-1);
    if(e.key==='ArrowRight') showImg(currentIdx+1);
    if(e.key==='Escape') closeDetail();
  });


  mainImg.addEventListener('click', ()=>{
    openLightbox(ev.images, currentIdx);
  });
  function buildDetailHTML(ev){
  const mainSrc = ev.images?.[0] || '';
  const imgs = (ev.images || []).slice(1).map((src,idx)=>`<img src="${src}" data-idx="${idx+1}" alt="${ev.title} imagen ${idx+2}" ${idx===0? 'aria-selected="true"': ''}>`).join('');
  const date = new Date(ev.datetime).toLocaleString();
  const soldBadge = ev.soldOut ? '<strong style="color:#c00">SOLD OUT</strong>' : '';
  const disabled = ev.soldOut ? 'disabled' : '';

  let cats = [];
  if(Array.isArray(ev.categories)) cats = ev.categories;
  else if(ev.category) cats = String(ev.category).split(/[,;|]/).map(s=>s.trim()).filter(Boolean);
  const categoriesHtml = cats.map(c => `<span class="badge">${c}</span>`).join(' ');
  return `
    <div class="detail-card" role="dialog" aria-modal="true" aria-label="Detalle de ${ev.title}" tabindex="0">
      <button class="close-detail" aria-label="Cerrar detalle">✕</button>
      <div class="detail-grid">
        <div class="gallery">
          <img class="gallery-main" src="${mainSrc}" alt="Imagen principal de ${ev.title}" data-idx="0" />
          <div class="gallery-controls">
            <button id="prevImg">«</button>
            <button id="nextImg">»</button>
          </div>
        </div>
        <div class="detail-body">
          <h2>${ev.title}</h2>
          <div class="category-badges">${categoriesHtml}</div>
          <div class="detail-meta">${(ev.artists||[]).join(', ')} · ${ev.venue} · ${ev.city}</div>
          <div class="detail-meta">${date} · ${soldBadge}</div>
          <p>${ev.description}</p>
          <dl>
            <dt>Políticas</dt>
            <dd>Edad: ${ev.policies?.age || '-'} • Reembolso: ${ev.policies?.refund || '-'}</dd>
          </dl>
          ${ (ev.map && (ev.map.embed || ev.map.address || (ev.map.lat && ev.map.lng))) ? (()=>{
        
            if(ev.map.embed){
              const src = ev.map.embed; return `<div class="detail-map"><iframe width="100%" height="300" frameborder="0" style="border:0" src="${src}" allowfullscreen></iframe></div>`;
            }
            if(ev.map.lat && ev.map.lng){
              return `<div class="detail-map"><iframe width="100%" height="300" frameborder="0" style="border:0" src="https://www.google.com/maps?q=${ev.map.lat},${ev.map.lng}&output=embed" allowfullscreen></iframe></div>`;
            }
            const q = encodeURIComponent(ev.map.address);
            return `<div class="detail-map"><iframe width="100%" height="300" frameborder="0" style="border:0" src="https://www.google.com/maps?q=${q}&output=embed" allowfullscreen></iframe></div>`;
          })() : '' }
          <div class="gallery-thumbs" role="list" aria-label="Miniaturas">${imgs}</div>
          <div class="detail-actions">
            <button id="favBtn" class="btn-ghost">${isFavorited(ev.id) ? '❤️ Favorito' : '♡ Favorito'}</button>
            <button id="shareBtn" class="btn-ghost">Compartir</button>
            <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
              <input id="qtyInput" type="number" min="1" value="1" style="width:70px;padding:8px;border:1px solid #ddd;border-radius:6px" ${disabled} />
              <button id="addCartBtn" class="btn-primary" ${disabled}>Agregar al carrito</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

  const dialog = els.detailEl.querySelector('.detail-card');
  if(dialog) dialog.focus();
}

function closeDetail(){
  history.pushState("", document.title, window.location.pathname + window.location.search);
  els.detailEl.hidden = true;
  els.detailEl.setAttribute('aria-hidden','true');
  els.catalogSection.hidden = false;
  els.detailEl.innerHTML = '';
}

function buildDetailHTML(ev){
 
  const mainSrc = ev.images?.[0] || '';
  const thumbs = (ev.images || []).slice(1, 6); 
  const thumbsHtml = thumbs.map((src, idx) => {
    const realIdx = idx + 1; 
    const artistLabel = ev.artists?.[idx] || '';
    return `
      <figure class="thumb">
        <img src="imagenes/${src.imagen}" data-idx="${realIdx}" alt="${ev.title} imagen ${realIdx+1}" ${idx===0? 'aria-selected="true"': ''}>
        <figcaption>${artistLabel}</figcaption>
      </figure>`;
  }).join('');
  const date = new Date(ev.datetime).toLocaleString();
  const soldBadge = ev.soldOut ? '<strong style="color:#c00">SOLD OUT</strong>' : '';
  const disabled = ev.soldOut ? 'disabled' : '';
  return `
    <div class="detail-card" role="dialog" aria-modal="true" aria-label="Detalle de ${ev.title}" tabindex="0">
      <button class="close-detail" aria-label="Cerrar detalle">✕</button>
      <div class="detail-grid">
        <div class="gallery">
          <!-- Thumbnails column (will be vertical on desktop) -->
          <div class="gallery-thumbs" role="list" aria-label="Miniaturas">${thumbsHtml}</div>
          <img class="gallery-main" src="${mainSrc}" alt="Imagen principal de ${ev.title}" />
        </div>
        <div class="detail-body">
          <h2>${ev.title}</h2>
          <div class="detail-meta">${(ev.artists||[]).join(', ')} · ${ev.venue} · ${ev.city}</div>
          <div class="detail-meta">${date} · ${soldBadge}</div>
          <p>${ev.description}</p>
          <dl>
            <dt>Políticas</dt>
            <dd>Edad: ${ev.policies?.age || '-'} • Reembolso: ${ev.policies?.refund || '-'}</dd>
          </dl>
          <div class="detail-actions">
            <button id="favBtn" class="btn-ghost">${isFavorited(ev.id) ? '❤️ Favorito' : '♡ Favorito'}</button>
            <button id="shareBtn" class="btn-ghost">Compartir</button>
            <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
              <input id="qtyInput" type="number" min="1" value="1" style="width:70px;padding:8px;border:1px solid #ddd;border-radius:6px" ${disabled} />
              <button id="addCartBtn" class="btn-primary" ${disabled}>Agregar al carrito</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}


function handleHash(){
  const h = location.hash || '';
  if(h.startsWith('#/event/')){
    const id = h.split('/')[2];
    openDetail(id);
  } else {
  
    if(!els.detailEl.hidden) closeDetail();
  }
}
window.addEventListener('hashchange', handleHash);
window.addEventListener('load', handleHash);


function attachDetailEvents(ev){
  const closeBtn = els.detailEl.querySelector('.close-detail');
  const mainImg = els.detailEl.querySelector('.gallery-main');
  const thumbs = Array.from(els.detailEl.querySelectorAll('.gallery-thumbs img'));
  const favBtn = els.detailEl.querySelector('#favBtn');
  const shareBtn = els.detailEl.querySelector('#shareBtn');
  const addCartBtn = els.detailEl.querySelector('#addCartBtn');
  const qtyInput = els.detailEl.querySelector('#qtyInput');

 
  thumbs.forEach(t => t.addEventListener('click', (e)=>{
    const src = e.currentTarget.src;
    mainImg.src = src;
    thumbs.forEach(x=>x.removeAttribute('aria-selected'));
    e.currentTarget.setAttribute('aria-selected','true');
  }));


  closeBtn.addEventListener('click', ()=> closeDetail());


  favBtn.addEventListener('click', ()=>{
    toggleFavorite(ev.id);
    favBtn.textContent = isFavorited(ev.id) ? '❤️ Favorito' : '♡ Favorito';
  });


  shareBtn.addEventListener('click', async ()=>{
    const url = location.origin + location.pathname + `#/event/${ev.id}`;
    try{ await navigator.clipboard.writeText(url); alert('URL copiada al portapapeles'); }
    catch(e){ prompt('Copia manualmente la URL:', url); }
  });


  addCartBtn.addEventListener('click', ()=>{
    const qty = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
    if(qty > ev.stock){ alert('No hay suficientes entradas disponibles.'); return; }
    addToCart({id: ev.id, qty, max: ev.stock});
    alert('Añadido al carrito');
  });


  els.detailEl.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDetail(); });
}


async function init(){
  await fetchEvents();
  applyFilters();
  attachEvents();
  renderCatalog();

 
}
init();

els.cartBtn = document.getElementById('cartBtn');
els.cartView = document.getElementById('cartView');

function openCart(){
  els.cartView.hidden = false;
  els.cartView.setAttribute('aria-hidden','false');
  renderCart();
}
function closeCart(){
  els.cartView.hidden = true;
  els.cartView.setAttribute('aria-hidden','true');
  els.cartView.innerHTML = '';
}

function renderCart(){
  const cart = storage.get('cart');
  if(cart.length===0){
    els.cartView.innerHTML = `
      <div class="cart-card" role="dialog" aria-modal="true">
        <div class="cart-header"><h2>Carrito</h2><button class="cart-close" aria-label="Cerrar">✕</button></div>
        <p>No hay items en el carrito.</p>
      </div>`;
  
    const emptyClose = els.cartView.querySelector('.cart-close');
    if(emptyClose) emptyClose.addEventListener('click', closeCart);
    return;
  }


  let itemsHTML = '';
  let total = 0;
  for(const item of cart){
    const ev = state.events.find(e=>e.id===item.id);
    if(!ev) continue;
    const subtotal = ev.priceFrom * item.qty;
    total += subtotal;
    itemsHTML += `
      <div class="cart-item">
        <span>${ev.title} (x${item.qty})</span>
        <span>${ev.currency} ${(subtotal).toFixed(2)}</span>
        <button class="remove-item" data-id="${ev.id}" aria-label="Eliminar">🗑</button>
      </div>`;
  }

  els.cartView.innerHTML = `
    <div class="cart-card" role="dialog" aria-modal="true">
      <div class="cart-header"><h2>Carrito</h2><button class="cart-close" aria-label="Cerrar">✕</button></div>
      <div class="cart-items">${itemsHTML}</div>
      <div class="cart-total">Total: ${total.toFixed(2)}</div>
      <button id="checkoutBtn" class="btn-primary">Finalizar compra</button>
    </div>`;
 
  const closeBtn = els.cartView.querySelector('.cart-header .cart-close');
  if(closeBtn) closeBtn.addEventListener('click', closeCart);

  const removeBtns = Array.from(els.cartView.querySelectorAll('.remove-item'));
  removeBtns.forEach(b => b.addEventListener('click', (e)=> removeFromCart(e.currentTarget.dataset.id)));
  document.getElementById('checkoutBtn').addEventListener('click', ()=> renderCheckout(total));
}

function removeFromCart(id){
  let cart = storage.get('cart');
  cart = cart.filter(i=>i.id!==id);
  storage.set('cart',cart);
  renderCart();
}

function renderCheckout(total){
  els.cartView.innerHTML = `
    <div class="cart-card" role="dialog" aria-modal="true">
      <div class="cart-header"><h2>Finalizar compra</h2><button class="cart-close" aria-label="Cerrar">✕</button></div>
      <form id="checkoutForm" class="checkout-form">
        <input type="text" id="buyerName" placeholder="Nombre completo" required>
        <input type="email" id="buyerEmail" placeholder="Correo electrónico" required>
        <input type="tel" id="buyerPhone" placeholder="Teléfono" required>
        <input type="text" id="buyerDNI" placeholder="DNI" required>
        <button type="submit" class="btn-primary">Confirmar</button>
      </form>
    </div>`;

  document.getElementById('checkoutForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    confirmOrder(total);
  });
 
  const checkoutClose = els.cartView.querySelector('.cart-close');
  if(checkoutClose) checkoutClose.addEventListener('click', closeCart);
}

function confirmOrder(total){
  const code = `EVT-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  
  const orders = storage.get('orders');
  orders.push({code,total,date:new Date().toISOString()});
  storage.set('orders',orders);
  storage.set('cart',[]);

  els.cartView.innerHTML = `
    <div class="cart-card success-screen">
      <h2>¡Compra exitosa!</h2>
      <p>Código de confirmación:</p>
      <p><strong>${code}</strong></p>
      <button class="btn-primary cart-close">Cerrar</button>
    </div>`;
  const successClose = els.cartView.querySelector('.cart-close');
  if(successClose) successClose.addEventListener('click', closeCart);
}
function openLightbox(images, startIdx=0){
  let idx = startIdx;
  const lb = document.createElement('div');
  lb.className='lightbox';
  lb.innerHTML=`
    <button id="closeLb">✕</button>
    <img src="${images[idx]}" alt="Imagen ampliada" />
    <div class="lightbox-nav"><span id="lbPrev">‹</span><span id="lbNext">›</span></div>
  `;
  document.body.appendChild(lb);

  const imgEl = lb.querySelector('img');
  function show(i){
    if(i<0) i=images.length-1;
    if(i>=images.length) i=0;
    idx=i;
    imgEl.src = images[i];
  }

  lb.querySelector('#closeLb').addEventListener('click', ()=> lb.remove());
  lb.querySelector('#lbPrev').addEventListener('click', ()=> show(idx-1));
  lb.querySelector('#lbNext').addEventListener('click', ()=> show(idx+1));
  lb.addEventListener('click', e=>{ if(e.target===lb) lb.remove(); });

  document.addEventListener('keydown', function escHandler(e){
    if(e.key==='Escape'){ lb.remove(); document.removeEventListener('keydown',escHandler); }
    if(e.key==='ArrowLeft') show(idx-1);
    if(e.key==='ArrowRight') show(idx+1);
  });
}
