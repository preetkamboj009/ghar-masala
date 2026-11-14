// Cart lives in this browser (localStorage) so it survives page loads; checkout is a <dialog> on every page.
// Prices come from prices.json; pay.php recalculates the total on the server, so nothing here is trusted.
document.body.insertAdjacentHTML("beforeend", `
<dialog class="co-dialog" aria-label="Checkout">
  <form method="dialog"><button class="co-x" aria-label="Close checkout">×</button></form>
  <h2>Checkout</h2>
  <p class="co-empty" hidden>Your cart is empty. Pick a spice to get started.</p>
  <div class="co-in">
    <div class="co-items"></div>
    <dl class="co-sum">
      <dt>Subtotal</dt><dd class="co-sub"></dd>
      <dt>Shipping</dt><dd class="co-ship"></dd>
      <dt class="tot">Total</dt><dd class="tot co-total"></dd>
    </dl>
    <p class="co-free"></p>
    <form class="co-form" method="post" action="pay.php">
      <h3>Delivery details</h3>
      <label>Full name<input name="name" required maxlength="60" autocomplete="name"></label>
      <label>Mobile number<input name="phone" type="tel" required pattern="[6-9][0-9]{9}" maxlength="10" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile"></label>
      <label>Email<input name="email" type="email" required maxlength="80" autocomplete="email"></label>
      <label>Address<textarea name="address" required maxlength="200" rows="2" autocomplete="street-address" placeholder="House no., street, village / area"></textarea></label>
      <div class="co-two">
        <label>City<input name="city" required maxlength="40" autocomplete="address-level2"></label>
        <label>Pin code<input name="pincode" required pattern="[0-9]{6}" maxlength="6" inputmode="numeric" autocomplete="postal-code"></label>
      </div>
      <label>State<input name="state" required maxlength="40" autocomplete="address-level1"></label>
      <input type="hidden" name="cart">
      <button class="btn btn-primary co-pay" type="submit" disabled>Pay Securely</button>
      <p class="co-note">Paid securely through PayU by UPI, card, net banking or wallet. We never see your card or UPI details. Prices include GST. By paying you agree to our <a href="policies.html#terms">Terms</a> and <a href="policies.html#refund">Refund Policy</a>.</p>
    </form>
  </div>
</dialog>`);
const dlg = document.querySelector(".co-dialog");
const openCheckout = () => { render(); dlg.showModal(); };
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // tap outside closes
document.addEventListener("click", (e) => {
  if (e.target.closest('a[href="#checkout"]')) { e.preventDefault(); openCheckout(); }
});
const fmt = (n) => "₹" + n.toLocaleString("en-IN");
let P = { shipping: 0, items: {} };
let cart = [];
try { cart = JSON.parse(localStorage.getItem("cart")) || []; } catch {}
const save = () => { try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {} };

const item = (id) => P.items[id] || {};
const subtotal = () => cart.reduce((s, c) => s + (item(c.id).price || 0) * c.qty, 0);
const count = () => cart.reduce((n, c) => n + c.qty, 0);
const shipFor = (sub) => (sub >= (P.freeShippingAbove ?? Infinity) ? 0 : P.shipping); // same rule as pay.php

function setQty(id, qty) {
  const hit = cart.find((c) => c.id === id);
  hit ? (hit.qty = Math.min(20, qty)) : cart.push({ id, qty: Math.min(20, qty) });
  cart = cart.filter((c) => c.qty > 0);
  save();
  render();
}

function render() {
  document.querySelectorAll(".cart-n").forEach((el) => (el.textContent = count()));

  document.querySelectorAll(".product").forEach((p) => {
    if (!p.querySelector(".price")) return;
    const price = item(`${p.dataset.id}-${p.querySelector('[aria-checked="true"]').dataset.size}`).price;
    p.querySelector(".price").textContent = price ? fmt(price) : "Price coming soon";
  });

  const bar = document.querySelector(".order");
  if (bar) {
    bar.hidden = cart.length === 0;
    const n = count(), sub = subtotal();
    const left = (P.freeShippingAbove || 0) - sub;
    bar.querySelector(".order-count").textContent = `${n} item${n > 1 ? "s" : ""} in your cart${sub ? " · " + fmt(sub) : ""}`
      + (!sub ? "" : left > 0 ? ` · Add ${fmt(left)} more for free shipping` : " · Free shipping 🎉");
    bar.querySelector(".order-list").textContent = cart.map((c) => `${c.qty} × ${item(c.id).name} (${item(c.id).size})`).join(", ");
  }

  const form = document.querySelector(".co-form");
  if (form) {
    document.querySelector(".co-in").hidden = cart.length === 0;
    document.querySelector(".co-empty").hidden = cart.length > 0;
    document.querySelector(".co-items").innerHTML = cart.map((c) => {
      const it = item(c.id);
      return `<div class="co-row">
        <img src="${it.img}" alt="">
        <div><b>${it.name}</b><span>${it.size} · ${it.price ? fmt(it.price) : "Price coming soon"}</span></div>
        <div class="qty"><button type="button" data-id="${c.id}" data-d="-1" aria-label="Less">−</button><output>${c.qty}</output><button type="button" data-id="${c.id}" data-d="1" aria-label="More">+</button></div>
        <b class="co-line">${it.price ? fmt(it.price * c.qty) : "–"}</b>
      </div>`;
    }).join("");
    const sub = subtotal(), ship = shipFor(sub), ready = cart.length > 0 && cart.every((c) => item(c.id).price > 0);
    const left = (P.freeShippingAbove || 0) - sub;
    document.querySelector(".co-sub").textContent = fmt(sub);
    document.querySelector(".co-ship").textContent = ship ? fmt(ship) : "Free";
    document.querySelector(".co-total").textContent = fmt(sub + ship);
    document.querySelector(".co-free").textContent = left > 0 ? `Add ${fmt(left)} more to get FREE shipping.` : "You get FREE shipping on this order.";
    form.querySelector(".co-pay").disabled = !ready;
    form.querySelector(".co-pay").textContent = ready ? `Pay ${fmt(sub + ship)} Securely` : "Online payment opening soon";
    form.cart.value = JSON.stringify(cart);
  }
}

// product cards
document.querySelectorAll(".product").forEach((p) => {
  const main = p.querySelector(".main-img img");
  const out = p.querySelector(".qty output");
  const id = () => `${p.dataset.id}-${p.querySelector('[aria-checked="true"]').dataset.size}`;
  const addToCart = () => setQty(id(), (cart.find((c) => c.id === id())?.qty || 0) + (out ? +out.value : 1));

  p.querySelectorAll(".thumbs button").forEach((b) => (b.onclick = () => {
    p.querySelector(".thumbs .on").classList.remove("on");
    b.classList.add("on");
    main.src = b.dataset.src;
  }));

  p.querySelectorAll(".sizes button").forEach((b) => (b.onclick = () => {
    p.querySelectorAll(".sizes button").forEach((x) => x.setAttribute("aria-checked", x === b));
    render();
  }));

  p.querySelectorAll(".qty button").forEach((b) => (b.onclick = () => {
    out.value = Math.max(1, Math.min(20, +out.value + +b.dataset.q));
  }));

  const add = p.querySelector(".add");
  if (add) add.onclick = () => {
    addToCart();
    add.textContent = "Added ✓";
    setTimeout(() => (add.textContent = "Add to Cart"), 1400);
  };
  p.querySelector(".now").onclick = () => { addToCart(); openCheckout(); };
});

document.querySelector(".order-clear")?.addEventListener("click", () => { cart = []; save(); render(); });

// checkout qty buttons
document.querySelector(".co-items")?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-d]");
  if (b) setQty(b.dataset.id, cart.find((c) => c.id === b.dataset.id).qty + +b.dataset.d);
});

// how-to-use tabs
const tabs = document.querySelectorAll('[role="tab"]');
tabs.forEach((t) => (t.onclick = () => {
  tabs.forEach((x) => {
    x.setAttribute("aria-selected", x === t);
    document.getElementById(x.getAttribute("aria-controls")).hidden = x !== t;
  });
}));

// scroll reveal
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

const yr = document.getElementById("yr");
if (yr) yr.textContent = new Date().getFullYear();

fetch("prices.json").then((r) => r.json()).then((p) => {
  P = p;
  cart = cart.filter((c) => P.items[c.id]); // drop products that no longer exist
  save();
}).catch(() => {}).finally(() => {
  render();
  if (location.hash === "#checkout") openCheckout(); // back from a failed payment
});

// videos: play only while on screen (saves mobile data), never autoplay for reduced-motion users
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause();
  }), { threshold: 0.25 });
  document.querySelectorAll(".film video").forEach((v) => vio.observe(v));
}
