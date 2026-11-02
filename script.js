// Cart lives in this browser (localStorage) so it survives the move to checkout.html.
// Prices come from prices.json; pay.php recalculates the total on the server, so nothing here is trusted.
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
  const addToCart = () => setQty(id(), (cart.find((c) => c.id === id())?.qty || 0) + +out.value);

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

  p.querySelector(".add").onclick = (e) => {
    addToCart();
    e.target.textContent = "Added ✓";
    setTimeout(() => (e.target.textContent = "Add to Cart"), 1400);
  };
  p.querySelector(".now").onclick = () => { addToCart(); location.href = "checkout.html"; };
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
}).catch(() => {}).finally(render);
