/* =============================================
   BREW HEAVEN — main.js
   Global: Cart, Drawer, Toast, Animations,
   Menu Filter, Forms, FAQ
   ============================================= */

/* ── Cart State ── */
let cart = JSON.parse(localStorage.getItem('bh_cart') || '[]');

function saveCart() {
  localStorage.setItem('bh_cart', JSON.stringify(cart));
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('#global-cart-count').forEach(el => {
    el.textContent = totalQty;
    el.classList.toggle('hidden', totalQty === 0);
  });
}

function addToCartQuick(name, priceStr, price, img) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, priceStr, price, img, qty: 1 });
  }
  saveCart();
  showToast(`${name} added to cart!`);
}

function changeQty(name, delta) {
  const item = cart.find(i => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.name !== name);
  }
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const footer = document.getElementById('cart-footer');
  const countLabel = document.getElementById('cart-item-count-label');
  const totalEl = document.getElementById('cart-total-price');

  if (!container) return;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (countLabel) countLabel.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''}`;
  if (totalEl) totalEl.textContent = `LKR ${totalPrice.toLocaleString()}`;
  if (footer) footer.style.display = cart.length > 0 ? 'block' : 'none';
  if (emptyState) emptyState.style.display = cart.length === 0 ? '' : 'none';

  // Remove existing rendered items
  container.querySelectorAll('.cart-item').forEach(el => el.remove());

  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=120&q=60'"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.priceStr} ea</div>
      </div>
      <div class="cart-qty-controls">
        <button class="cart-qty-btn" onclick="changeQty('${item.name.replace(/'/g,"\\'")}', -1)">−</button>
        <span class="cart-qty-val">${item.qty}</span>
        <button class="cart-qty-btn" onclick="changeQty('${item.name.replace(/'/g,"\\'")}', 1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}

/* ── Inject Custom CSS for Payment Portal ── */
const bhPaymentStyles = `
  .bh-portal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(39, 19, 16, 0.55);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .bh-portal-overlay.show {
    opacity: 1;
    pointer-events: all;
  }
  .bh-portal-card {
    background: #fbf9f5;
    border-radius: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(39, 19, 16, 0.25);
    border: 1px solid #d3c3c0;
    max-width: 480px;
    width: 100%;
    overflow: hidden;
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .bh-portal-overlay.show .bh-portal-card {
    transform: scale(1);
  }
  .bh-input-field {
    width: 100%;
    background: #f5f3ef;
    border: 1px solid #d3c3c0;
    border-radius: 0.75rem;
    padding: 0.875rem;
    outline: none;
    font-family: inherit;
    font-size: 0.95rem;
    transition: all 0.25s ease;
  }
  .bh-input-field:focus {
    border-color: #496455;
    box-shadow: 0 0 0 3px rgba(73, 100, 85, 0.15);
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 1.5s linear infinite;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = bhPaymentStyles;
document.head.appendChild(styleEl);

/* ── Create Checkout & Success Modals ── */
function initCheckoutModal() {
  if (document.getElementById('bh-checkout-modal')) return;

  const modalHtml = `
    <div id="bh-checkout-modal" class="bh-portal-overlay">
      <div class="bh-portal-card animate-fade-in">
        <!-- Close Button -->
        <div class="flex justify-between items-center p-6 border-b border-outline-variant/30">
          <h3 class="font-headline-md text-headline-md text-primary font-bold">Secure Checkout</h3>
          <button onclick="closeCheckout()" class="p-2 rounded-full hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-primary">close</span>
          </button>
        </div>
        
        <!-- Payment Details Form -->
        <form id="bh-payment-form" onsubmit="processPayment(event)" class="p-6 space-y-4">
          <div class="bg-surface-container rounded-xl p-4 mb-4 border border-outline-variant/20">
            <h4 class="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Order Summary</h4>
            <div id="bh-checkout-items" class="max-h-[120px] overflow-y-auto space-y-2 mb-3 pr-2 scrollbar-thin"></div>
            <div class="flex justify-between items-center pt-2 border-t border-outline-variant/30 text-sm">
              <span class="text-on-surface-variant font-semibold">Grand Total</span>
              <span id="bh-checkout-total" class="font-bold text-primary text-base">LKR 0</span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">Cardholder Name *</label>
            <input type="text" required placeholder="John Doe" class="bh-input-field"/>
          </div>

          <div>
            <label class="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">Card Number *</label>
            <div class="relative">
              <input type="text" id="bh-card-number" required placeholder="4111 2222 3333 4444" maxlength="19" class="bh-input-field pl-12"/>
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">credit_card</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">Expiry Date *</label>
              <input type="text" id="bh-card-expiry" required placeholder="MM/YY" maxlength="5" class="bh-input-field text-center"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">CVV *</label>
              <input type="password" required placeholder="•••" maxlength="3" class="bh-input-field text-center"/>
            </div>
          </div>

          <button type="submit" id="bh-pay-btn" class="w-full bg-primary hover:bg-secondary text-white font-bold py-4 rounded-full transition-all shadow-md mt-6 flex items-center justify-center gap-2">
            Pay Securely
          </button>
        </form>

        <!-- Loading / Processing View -->
        <div id="bh-processing-view" class="hidden p-10 flex flex-col items-center justify-center text-center space-y-6">
          <div class="relative flex items-center justify-center">
            <div class="w-16 h-16 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin-slow"></div>
            <span class="material-symbols-outlined text-secondary absolute text-2xl">coffee</span>
          </div>
          <div>
            <h3 class="font-headline-md text-primary font-bold">Authorizing Card...</h3>
            <p class="text-on-surface-variant text-sm mt-1">Please do not refresh or close this window.</p>
          </div>
        </div>

        <!-- Success Receipt View -->
        <div id="bh-receipt-view" class="hidden p-8 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h3 class="font-headline-md text-primary font-bold mb-1">Payment Successful!</h3>
          <p id="bh-receipt-order-id" class="text-xs text-secondary font-mono tracking-wider font-semibold uppercase bg-secondary-container px-3 py-1 rounded-full mb-6"></p>

          <div class="w-full bg-surface-container rounded-2xl p-6 text-left space-y-4 mb-6 border border-outline-variant/10 text-sm">
            <h4 class="font-bold text-primary border-b border-outline-variant/30 pb-2">Receipt Details</h4>
            <div id="bh-receipt-items" class="space-y-2 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin"></div>
            <div class="flex justify-between font-bold border-t border-outline-variant/30 pt-3 text-primary text-base">
              <span>Paid Amount</span>
              <span id="bh-receipt-total">LKR 0</span>
            </div>
          </div>

          <div class="bg-secondary-container text-on-secondary-container rounded-xl p-4 w-full text-left flex gap-3 items-start mb-8 text-xs leading-relaxed">
            <span class="material-symbols-outlined text-secondary flex-shrink-0 text-base">location_on</span>
            <div>
              <p class="font-bold">Pick-Up Sanctuary</p>
              <p class="mt-0.5">124 Marine Drive, Colombo 4</p>
              <p class="font-bold mt-1 text-secondary">Ready for pickup in 15 mins</p>
            </div>
          </div>

          <button onclick="finishOrder()" class="w-full bg-secondary hover:bg-primary text-white font-bold py-4 rounded-full transition-all shadow-md">
            Done
          </button>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container.firstElementChild);

  // Card Number Format formatting listener
  const cardInput = document.getElementById('bh-card-number');
  cardInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    e.target.value = formatted;
  });

  // Expiry Date Format listener
  const expiryInput = document.getElementById('bh-card-expiry');
  expiryInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
      e.target.value = value;
    }
  });
}

function handleCheckout() {
  if (cart.length === 0) return;
  closeCart();
  initCheckoutModal();
  
  // Populating Summary
  const itemsContainer = document.getElementById('bh-checkout-items');
  const totalLabel = document.getElementById('bh-checkout-total');
  
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map(item => `
      <div class="flex justify-between items-center text-xs text-on-surface-variant leading-relaxed">
        <span>${item.name} <strong class="text-primary font-bold">x${item.qty}</strong></span>
        <span class="font-semibold text-primary">LKR ${(item.price * item.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }
  if (totalLabel) totalLabel.textContent = `LKR ${totalPrice.toLocaleString()}`;

  // Reset Modal state
  document.getElementById('bh-payment-form')?.classList.remove('hidden');
  document.getElementById('bh-processing-view')?.classList.add('hidden');
  document.getElementById('bh-receipt-view')?.classList.add('hidden');
  document.getElementById('bh-payment-form')?.reset();

  document.getElementById('bh-checkout-modal')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('bh-checkout-modal')?.classList.remove('show');
  document.body.style.overflow = '';
}

function processPayment(e) {
  e.preventDefault();
  
  // Transition to Processing state
  document.getElementById('bh-payment-form')?.classList.add('hidden');
  document.getElementById('bh-processing-view')?.classList.remove('hidden');

  setTimeout(() => {
    // Generate Order ID & display details in receipt
    const orderId = `BH-${Math.floor(10000 + Math.random() * 90000)}`;
    const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const receiptItems = document.getElementById('bh-receipt-items');
    const receiptTotal = document.getElementById('bh-receipt-total');
    const orderIdLabel = document.getElementById('bh-receipt-order-id');

    if (receiptItems) {
      receiptItems.innerHTML = cart.map(item => `
        <div class="flex justify-between items-center text-xs text-on-surface-variant">
          <span>${item.name} (x${item.qty})</span>
          <span class="font-semibold text-primary">LKR ${(item.price * item.qty).toLocaleString()}</span>
        </div>
      `).join('');
    }
    if (receiptTotal) receiptTotal.textContent = `LKR ${totalPrice.toLocaleString()}`;
    if (orderIdLabel) orderIdLabel.textContent = `Order Reference: ${orderId}`;

    // Transition to receipt view
    document.getElementById('bh-processing-view')?.classList.add('hidden');
    document.getElementById('bh-receipt-view')?.classList.remove('hidden');
  }, 1800);
}

function finishOrder() {
  cart = [];
  saveCart();
  closeCheckout();
  showToast('Order confirmed! See you at the sanctuary.');
}

/* ── Toast Notification ── */
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── Mobile Drawer ── */
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
  document.body.style.overflow = drawer.classList.contains('hidden') ? '' : 'hidden';
}

/* ── Menu Filter ── */
function filterMenu(category, btn) {
  // Update chip active states
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  const allCards = document.querySelectorAll('.menu-card');

  if (category === 'all') {
    // Show all sections and cards
    document.querySelectorAll('[id^="section-"]').forEach(s => {
      s.style.display = '';
    });
    allCards.forEach(card => {
      card.style.display = '';
      card.style.animation = 'none';
      setTimeout(() => card.style.animation = '', 10);
    });
    return;
  }

  // Filter cards
  allCards.forEach(card => {
    const cats = (card.dataset.category || '').split(' ');
    const show = cats.includes(category);
    card.style.display = show ? '' : 'none';
  });

  // Hide sections that have no visible cards
  document.querySelectorAll('[id^="section-"]').forEach(section => {
    const visibleCards = section.querySelectorAll(`.menu-card[style=""],.menu-card:not([style])`);
    const allSectionCards = section.querySelectorAll('.menu-card');
    const hasVisible = Array.from(allSectionCards).some(c => c.style.display !== 'none');
    section.style.display = hasVisible ? '' : 'none';
  });
}

/* ── Scroll Animations ── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

/* ── Career Form ── */
function selectJob(jobKey) {
  // Update card selection
  document.querySelectorAll('.job-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('job-' + jobKey);
  if (card) card.classList.add('selected');

  // Update form select and label
  const select = document.getElementById('career-position');
  const label = document.getElementById('selected-job-label');
  if (select) {
    const opt = Array.from(select.options).find(o => o.value === jobKey);
    if (opt) select.value = jobKey;
  }
  const titles = {
    barista: 'Lead Artisan Barista',
    supervisor: 'Shift Operations Supervisor',
    pastry: 'Junior Pastry Baker'
  };
  if (label) label.textContent = `Applying for: ${titles[jobKey] || ''}`;
}

function handleCareerSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('careers-form');
  const success = document.getElementById('careers-success');
  const btn = document.getElementById('career-submit-btn');

  if (!form) return;

  // Validate
  const name = document.getElementById('career-name')?.value.trim();
  const email = document.getElementById('career-email')?.value.trim();
  const phone = document.getElementById('career-phone')?.value.trim();
  const position = document.getElementById('career-position')?.value;
  const experience = document.getElementById('career-experience')?.value;
  const message = document.getElementById('career-message')?.value.trim();

  if (!name || !email || !phone || !position || !experience || !message) {
    showToast('Please fill in all required fields.');
    return;
  }

  // Simulate submission
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Submitting...';
  }

  setTimeout(() => {
    form.style.display = 'none';
    if (success) success.classList.remove('hidden');
    showToast('Application submitted successfully!');
  }, 1200);
}

/* ── Contact Form ── */
function handleContactSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contact-message-form');
  const success = document.getElementById('contact-success');
  const btn = document.getElementById('contact-submit-btn');

  const name = document.getElementById('contact-name')?.value.trim();
  const email = document.getElementById('contact-email')?.value.trim();
  const subject = document.getElementById('contact-subject')?.value;
  const message = document.getElementById('contact-message')?.value.trim();

  if (!name || !email || !subject || !message) {
    showToast('Please fill in all required fields.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">progress_activity</span> Sending...';
  }

  setTimeout(() => {
    if (form) form.style.display = 'none';
    if (success) success.classList.remove('hidden');
    showToast('Your message has been sent!');
  }, 1000);
}

/* ── Newsletter Form ── */
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button[type="submit"]');

  if (!input?.value) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Subscribed!'; }

  setTimeout(() => {
    showToast('🎉 You\'re on the list! Welcome to the Brew Heaven community.');
    input.value = '';
    if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
  }, 800);
}

/* ── FAQ Accordion ── */
function toggleFaq(btn) {
  const body = btn.nextElementSibling;
  const icon = btn.querySelector('.material-symbols-outlined');
  const isOpen = !body.classList.contains('hidden');

  // Close all
  document.querySelectorAll('.faq-body').forEach(b => b.classList.add('hidden'));
  document.querySelectorAll('.faq-btn .material-symbols-outlined').forEach(i => i.style.transform = '');

  if (!isOpen) {
    body.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  updateCartBadge();
  initScrollAnimations();

  // Close drawer on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleDrawer();
      closeCart();
    }
  });

  // Immediately trigger animations for elements in viewport on load
  setTimeout(() => {
    document.querySelectorAll('.fade-up').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('visible');
      }
    });
  }, 100);
});
