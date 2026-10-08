import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Flame,
  Heart, History, MapPin, Menu, Minus, Plus, Search, ShoppingBag,
  SlidersHorizontal, Sparkles, Star, Store, Tag, Trash2, Truck, X,
} from 'lucide-react';
import { addOns, burgerMenu } from './burgerData';
import type { BurgerCategory, BurgerItem, CartItem } from './burgerData';
import {
  addToCart, changeQuantity, DELIVERY_FEE, formatPrice, FREE_DELIVERY_AT,
  getCartCount, getCartTotal, getDeliveryFee, getDiscount, MAX_QUANTITY,
  PROMO_CODE, removeFromCart, restoreCart, calculateUnitPrice,
} from './cartUtils';
import fallbackImage from './assets/burger-fallback.svg';
import './App.css';

type Category = 'All' | BurgerCategory;
type SortOption = 'featured' | 'low' | 'high' | 'rating';
type View = 'customize' | 'cart' | 'checkout' | 'orders' | 'success' | null;
type Fulfillment = 'pickup' | 'delivery';

type Order = {
  id: string;
  date: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  fulfillment: Fulfillment;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
};

const CATEGORIES: Category[] = ['All', 'Beef', 'Chicken', 'Vegan'];
const CART_KEY = 'tasty.v3.cart';
const FAV_KEY = 'tasty.v3.favorites';
const ORDER_KEY = 'tasty.v3.orders';

function readStorage(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function initialFavorites(): number[] {
  const saved = readStorage(FAV_KEY);
  if (!Array.isArray(saved)) return [];
  return saved.filter((id): id is number =>
    typeof id === 'number' && burgerMenu.some((burger) => burger.id === id));
}

function initialOrders(): Order[] {
  const saved = readStorage(ORDER_KEY);
  if (!Array.isArray(saved)) return [];
  return saved.filter((item): item is Order =>
    !!item && typeof item.id === 'string' && typeof item.date === 'string' &&
    Array.isArray(item.items) && Number.isFinite(item.total)).slice(0, 15);
}

function BurgerImage({ burger, className = '' }: { burger: BurgerItem; className?: string }) {
  return <img className={className} src={burger.image} alt={burger.name}
    loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage; }} />;
}

function App() {
  const [cart, setCart] = useState<CartItem[]>(() => restoreCart(readStorage(CART_KEY)));
  const [favorites, setFavorites] = useState<number[]>(initialFavorites);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [view, setView] = useState<View>(null);
  const [selectedBurger, setSelectedBurger] = useState<BurgerItem | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [customQty, setCustomQty] = useState(1);
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [hasPromo, setHasPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* optional storage */ } }, [cart]);
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* optional storage */ } }, [favorites]);
  useEffect(() => { try { localStorage.setItem(ORDER_KEY, JSON.stringify(orders)); } catch { /* optional storage */ } }, [orders]);

  useEffect(() => {
    if (!view) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setView(null); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = original; document.removeEventListener('keydown', onKey); };
  }, [view]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2700);
  }

  const filteredBurgers = useMemo(() => {
    const text = query.toLowerCase().trim();
    const matches = burgerMenu.filter((burger) =>
      (category === 'All' || burger.category === category) &&
      (!onlyFavorites || favorites.includes(burger.id)) &&
      (!text || `${burger.name} ${burger.category} ${burger.description}`.toLowerCase().includes(text)));
    return [...matches].sort((a, b) => {
      if (sort === 'low') return a.price - b.price;
      if (sort === 'high') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return Number(Boolean(b.popular)) - Number(Boolean(a.popular)) || a.id - b.id;
    });
  }, [category, favorites, onlyFavorites, query, sort]);

  const count = getCartCount(cart);
  const subtotal = getCartTotal(cart);
  const discount = getDiscount(subtotal, hasPromo);
  const shipping = getDeliveryFee(subtotal, fulfillment);
  const total = Math.max(0, subtotal - discount + shipping);
  const customUnit = selectedBurger ? calculateUnitPrice(selectedBurger, selectedAddOns) : 0;

  function quickAdd(burger: BurgerItem) {
    setCart((current) => addToCart(current, burger));
    notify(`${burger.name} added to bag!`);
  }

  function openCustomize(burger: BurgerItem) {
    setSelectedBurger(burger);
    setSelectedAddOns([]);
    setCustomQty(1);
    setView('customize');
  }

  function addCustomized() {
    if (!selectedBurger) return;
    setCart((current) => addToCart(current, selectedBurger, selectedAddOns, customQty));
    setView(null);
    notify(`${customQty} × ${selectedBurger.name} added to bag!`);
  }

  function toggleFavorite(id: number) {
    const added = !favorites.includes(id);
    setFavorites((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    notify(added ? 'Added to your favorites ❤️' : 'Removed from favorites');
  }

  function applyPromo() {
    if (promoInput.trim().toUpperCase() !== PROMO_CODE) {
      setPromoError('Invalid code. Try BURGER10.');
      return;
    }
    setHasPromo(true);
    setPromoError('');
    notify('10% discount unlocked!');
  }

  function resetFilters() {
    setCategory('All'); setQuery(''); setSort('featured'); setOnlyFavorites(false);
  }

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.replace(/[\s-]/g, '');
    if (trimmedName.length < 2) { setCheckoutError('Please enter your full name.'); return; }
    if (!/^(09\d{9}|\+639\d{9})$/.test(trimmedPhone)) {
      setCheckoutError('Enter a valid PH number, e.g. 09171234567.'); return;
    }
    if (fulfillment === 'delivery' && address.trim().length < 8) {
      setCheckoutError('Please add your complete delivery address.'); return;
    }
    if (!cart.length) { setCheckoutError('Your bag is empty.'); return; }

    const order: Order = {
      id: `TB-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      name: trimmedName, phone: trimmedPhone, address: fulfillment === 'delivery' ? address.trim() : '',
      notes: notes.trim(), fulfillment, items: cart.map((item) => ({ ...item, addOnIds: [...item.addOnIds] })),
      subtotal, discount, deliveryFee: shipping, total,
    };
    setOrders((current) => [order, ...current].slice(0, 15));
    setLastOrder(order);
    setCart([]);
    setHasPromo(false); setPromoInput(''); setCheckoutError(''); setNotes('');
    setView('success');
  }

  function reorder(order: Order) {
    let newCart = [...cart];
    for (const item of order.items) {
      const burger = burgerMenu.find((candidate) => candidate.id === item.burgerId);
      if (burger) newCart = addToCart(newCart, burger, item.addOnIds, item.quantity);
    }
    setCart(newCart);
    setView('cart');
    notify('Items added to your bag!');
  }

  return (
    <div className="site-shell">
      <div className="announcement"><Sparkles size={15} /> BIG CRAVINGS? USE <strong>BURGER10</strong> FOR 10% OFF <span>•</span> FREE DELIVERY FROM {formatPrice(FREE_DELIVERY_AT)}</div>
      <header className="site-header">
        <div className="header-inner container">
          <a className="brand" href="#home" onClick={() => setMobileMenu(false)} aria-label="Tasty Burger home">
            <span className="brand-icon">🍔</span>
            <span className="brand-text"><b>TASTY</b><b>BURGER<span>.</span></b></span>
          </a>
          <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`} aria-label="Main navigation">
            <a href="#home" onClick={() => setMobileMenu(false)}>Home</a>
            <a href="#menu" onClick={() => setMobileMenu(false)}>Our menu</a>
            <a href="#about" onClick={() => setMobileMenu(false)}>Why us</a>
            <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
          </nav>
          <div className="nav-buttons">
            <button className="icon-button desktop-icon" aria-label="View favorites" title="View favorites"
              onClick={() => { setOnlyFavorites((old) => !old); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Heart size={21} fill={onlyFavorites ? '#e3422f' : 'none'} />
              {favorites.length > 0 && <span className="tiny-count">{favorites.length}</span>}
            </button>
            <button className="icon-button desktop-icon" aria-label="Order history" title="Order history" onClick={() => setView('orders')}><History size={21} /></button>
            <button className="bag-button" onClick={() => setView('cart')} aria-label={`Open bag with ${count} items`}>
              <ShoppingBag size={20} /><span>My bag</span><b>{count}</b>
            </button>
            <button className="icon-button mobile-menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileMenu} onClick={() => setMobileMenu((old) => !old)}>{mobileMenu ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-grid container">
            <div className="hero-copy">
              <div className="eyebrow"><Flame size={17} fill="currentColor" /> MADE FRESH. SERVED BOLD.</div>
              <h1>BIG FLAVOR.<br /><span>ZERO</span><br />REGRETS<span className="hero-dot">.</span></h1>
              <p>Juicy patties. Melted cheese. Saucy, messy, unforgettable bites. Your next favorite burger is one click away.</p>
              <div className="hero-actions">
                <a href="#menu" className="primary-button">EXPLORE MENU <ArrowRight size={19} /></a>
                <button className="text-button" onClick={() => setView('orders')}><History size={18} /> My orders</button>
              </div>
              <div className="hero-highlights">
                <div><span>🔥</span><strong>Made to order</strong><small>Hot, fresh & tasty</small></div>
                <div><span>🛵</span><strong>Pickup or delivery</strong><small>Your call, your cravings</small></div>
              </div>
            </div>
            <div className="hero-visual" aria-label="Featured cheeseburger">
              <div className="hero-blob" />
              <span className="hero-doodle doodle-one">✦</span><span className="hero-doodle doodle-two">✳</span>
              <BurgerImage burger={burgerMenu[2]} className="hero-burger" />
              <div className="hero-price"><small>STARTS AT</small><strong>{formatPrice(burgerMenu[2].price)}</strong></div>
              <div className="hero-sticker">100%<br /><span>CRAVE<br />WORTHY</span></div>
            </div>
          </div>
          <div className="ticker"><div>FRESH INGREDIENTS <span>✦</span> BIG BURGER ENERGY <span>✦</span> MADE WITH LOVE <span>✦</span> FULL OF FLAVOR <span>✦</span> FRESH INGREDIENTS <span>✦</span> BIG BURGER ENERGY <span>✦</span></div></div>
        </section>

        <section className="menu-section container" id="menu">
          <div className="section-topline"><span><span className="accent-line" /> THE GOOD STUFF</span><span>01 / OUR MENU</span></div>
          <div className="section-heading"><div><h2>MEET THE <em>BURGERS.</em></h2><p>Warning: scrolling may cause serious cravings.</p></div><div className="menu-counter">{filteredBurgers.length} tasty picks</div></div>
          <div className="filter-panel">
            <div className="category-pills" aria-label="Burger categories">
              {CATEGORIES.map((item) => <button key={item} className={`category-pill ${category === item ? 'selected' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'All' ? '🍔 ' : item === 'Beef' ? '🥩 ' : item === 'Chicken' ? '🍗 ' : '🌿 '}{item === 'All' ? 'All burgers' : item}</button>)}
            </div>
            <div className="filter-actions">
              <label className="search-input"><Search size={19} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your cravings..." aria-label="Search burgers" /></label>
              <label className="sort-select"><SlidersHorizontal size={18} /><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="Sort burgers"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select></label>
              <button className={`fav-filter ${onlyFavorites ? 'active' : ''}`} onClick={() => setOnlyFavorites((old) => !old)} aria-pressed={onlyFavorites}><Heart size={19} fill={onlyFavorites ? 'currentColor' : 'none'} /> <span>Saved</span></button>
            </div>
          </div>
          {filteredBurgers.length > 0 ? <div className="burger-grid">
            {filteredBurgers.map((burger) => <article className="burger-card" key={burger.id}>
              <div className="burger-photo"><BurgerImage burger={burger} className="burger-img" />
                {burger.badge && <span className="product-badge">{burger.badge}</span>}
                <button className={`favorite-on-card ${favorites.includes(burger.id) ? 'active' : ''}`} aria-label={favorites.includes(burger.id) ? `Remove ${burger.name} from favorites` : `Favorite ${burger.name}`} onClick={() => toggleFavorite(burger.id)}><Heart size={20} fill={favorites.includes(burger.id) ? 'currentColor' : 'none'} /></button>
              </div>
              <div className="burger-card-info">
                <div className="burger-meta"><span className="category-label">{burger.category}</span><span><Star size={14} fill="currentColor" /> {burger.rating.toFixed(1)}</span><span><Clock3 size={14} /> {burger.prepMinutes} min</span></div>
                <h3>{burger.name}</h3><p>{burger.description}</p>
                <div className="burger-bottom"><div className="burger-price"><small>FROM</small><strong>{formatPrice(burger.price)}</strong></div><div className="burger-buttons"><button className="customize-button" onClick={() => openCustomize(burger)} title={`Customize ${burger.name}`}>Customize</button><button className="quick-add-button" aria-label={`Add ${burger.name} to cart`} onClick={() => quickAdd(burger)}><Plus size={22} /></button></div></div>
              </div>
            </article>)}
          </div> : <div className="empty-menu"><span>🍔</span><h3>No burgers found</h3><p>Try a different category or search phrase.</p><button className="outline-button" onClick={resetFilters}>Clear filters</button></div>}
        </section>

        <section className="promo-banner container" aria-label="Promo offer">
          <div className="promo-icon">🎟️</div><div><span className="promo-kicker">THE DEAL YOU DESERVE</span><h2>GOOD FOOD. <em>BETTER DEALS.</em></h2><p>Take 10% off your burger fix, up to {formatPrice(100)} discount. Use the code at checkout.</p></div><button onClick={() => { setPromoInput(PROMO_CODE); setHasPromo(true); setPromoError(''); setView('cart'); notify('BURGER10 applied!'); }}>USE CODE: <b>BURGER10</b> <ArrowRight size={18} /></button>
        </section>

        <section className="why-section" id="about"><div className="container"><div className="section-topline"><span><span className="accent-line" /> WHY TASTY BURGER</span><span>02 / OUR PROMISE</span></div><h2>NOT YOUR <em>AVERAGE</em> BITE.</h2><div className="why-grid"><div className="why-card"><div>🍔</div><h3>BURGERS YOUR WAY</h3><p>Pick your favorite burger and load it up with the extras you love.</p></div><div className="why-card"><div>⚡</div><h3>SUPER EASY ORDERING</h3><p>Build your bag, choose pickup or delivery, and confirm in a few taps.</p></div><div className="why-card"><div>💛</div><h3>SAVE YOUR FAVORITES</h3><p>Keep the burgers you crave and your demo orders in one place.</p></div></div></div></section>
      </main>

      <footer className="site-footer" id="contact"><div className="container footer-inner"><div><div className="footer-brand">🍔 TASTY BURGER<span>.</span></div><p>Made for the love of burgers.<br />This is a sample ordering website.</p></div><div className="footer-right"><a href="#home">Back to top ↑</a><a href="#menu">Explore menu</a><button onClick={() => setView('orders')}>Order history</button><small>© {new Date().getFullYear()} Tasty Burger • Frontend demo</small></div></div></footer>

      {count > 0 && <button className="mobile-cart-bar" onClick={() => setView('cart')}><span><ShoppingBag size={19} /> View bag <b>{count}</b></span><strong>{formatPrice(subtotal)} <ArrowRight size={18} /></strong></button>}
      {toast && <div className="toast-message" role="status"><CheckCircle2 size={18} />{toast}</div>}

      {view && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setView(null); }}>
        <div className={`modal-surface ${view === 'customize' ? 'customize-modal' : 'drawer-modal'}`} role="dialog" aria-modal="true" aria-label={view === 'customize' ? 'Customize burger' : 'Tasty Burger ordering panel'}>
          {view === 'customize' && selectedBurger && <>
            <div className="modal-top"><h2>Make it <em>yours.</em></h2><button className="close-modal" aria-label="Close customization" onClick={() => setView(null)}><X size={23} /></button></div>
            <div className="customize-content"><BurgerImage burger={selectedBurger} className="customize-image" /><div className="customize-details"><span className="category-label">{selectedBurger.category}</span><h3>{selectedBurger.name}</h3><p>{selectedBurger.description}</p><h4>LEVEL UP YOUR BURGER</h4><div className="addons-list">{addOns.filter((addon) => !addon.categories || addon.categories.includes(selectedBurger.category)).map((addon) => <label key={addon.id} className={`addon-option ${selectedAddOns.includes(addon.id) ? 'checked' : ''}`}><input type="checkbox" checked={selectedAddOns.includes(addon.id)} onChange={() => setSelectedAddOns((current) => current.includes(addon.id) ? current.filter((id) => id !== addon.id) : [...current, addon.id])} /><span>{addon.name}</span><strong>+{formatPrice(addon.price)}</strong></label>)}</div><div className="customize-footer"><div className="qty-buttons"><button aria-label="Decrease quantity" disabled={customQty <= 1} onClick={() => setCustomQty((old) => Math.max(1, old - 1))}><Minus size={17} /></button><b>{customQty}</b><button aria-label="Increase quantity" disabled={customQty >= MAX_QUANTITY} onClick={() => setCustomQty((old) => Math.min(MAX_QUANTITY, old + 1))}><Plus size={17} /></button></div><button className="primary-button" onClick={addCustomized}>ADD • {formatPrice(customUnit * customQty)} <ArrowRight size={18} /></button></div></div></div>
          </>}

          {view === 'cart' && <><div className="modal-top"><div><span className="modal-kicker">YOUR CRAVINGS</span><h2>My bag <em>({count})</em></h2></div><button className="close-modal" aria-label="Close bag" onClick={() => setView(null)}><X size={23} /></button></div>
            {cart.length ? <><div className="drawer-scroll"><div className="cart-lines">{cart.map((item) => <div className="cart-line" key={item.key}><img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} /><div className="cart-line-details"><h3>{item.name}</h3><p>{item.addOnIds.length ? item.addOnIds.map((id) => addOns.find((addon) => addon.id === id)?.name).join(' · ') : 'Classic recipe'}</p><strong>{formatPrice(item.unitPrice * item.quantity)}</strong><div className="line-bottom"><div className="qty-buttons small"><button aria-label={`Decrease ${item.name}`} onClick={() => setCart((old) => changeQuantity(old, item.key, -1))}><Minus size={15} /></button><b>{item.quantity}</b><button disabled={item.quantity >= MAX_QUANTITY} aria-label={`Increase ${item.name}`} onClick={() => setCart((old) => changeQuantity(old, item.key, 1))}><Plus size={15} /></button></div><button className="delete-line" aria-label={`Remove ${item.name}`} onClick={() => setCart((old) => removeFromCart(old, item.key))}><Trash2 size={18} /></button></div></div></div>)}</div><div className="coupon-box"><div><Tag size={18} /><strong>Have a discount code?</strong></div>{hasPromo ? <div className="coupon-applied"><Check size={17} /> BURGER10 applied <button onClick={() => { setHasPromo(false); setPromoInput(''); }}>Remove</button></div> : <div className="coupon-input"><input value={promoInput} onChange={(event) => { setPromoInput(event.target.value); setPromoError(''); }} placeholder="Enter BURGER10" aria-label="Promo code" /><button onClick={applyPromo}>Apply</button></div>}{promoError && <small className="form-error">{promoError}</small>}</div></div><div className="drawer-bottom"><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>{hasPromo && <div className="summary-row green"><span>Discount (10%)</span><strong>-{formatPrice(discount)}</strong></div>}<div className="summary-row muted"><span>Delivery</span><span>Calculated at checkout</span></div><div className="summary-row summary-total"><span>Bag total</span><strong>{formatPrice(subtotal - discount)}</strong></div><button className="primary-button full-button" onClick={() => { setCheckoutError(''); setView('checkout'); }}>CONTINUE TO CHECKOUT <ArrowRight size={19} /></button><button className="continue-shopping" onClick={() => setView(null)}>Keep exploring burgers</button></div></> : <div className="drawer-empty"><span>🍟</span><h3>Your bag feels lonely!</h3><p>Something delicious is only a click away.</p><button className="primary-button" onClick={() => setView(null)}>FIND MY BURGER <ArrowRight size={17} /></button></div>}</>}

          {view === 'checkout' && <><div className="modal-top"><button className="back-button" onClick={() => setView('cart')} aria-label="Back to bag"><ArrowLeft size={22} /></button><div className="modal-grow"><span className="modal-kicker">ALMOST THERE!</span><h2>Checkout<span className="hero-dot">.</span></h2></div><button className="close-modal" aria-label="Close checkout" onClick={() => setView(null)}><X size={23} /></button></div>
            <form onSubmit={placeOrder} className="checkout-form"><div className="drawer-scroll"><h3>How do you want your burgers?</h3><div className="fulfillment-options"><button type="button" className={fulfillment === 'pickup' ? 'selected' : ''} onClick={() => setFulfillment('pickup')}><Store size={23} /><strong>Pickup</strong><small>Free</small></button><button type="button" className={fulfillment === 'delivery' ? 'selected' : ''} onClick={() => setFulfillment('delivery')}><Truck size={23} /><strong>Delivery</strong><small>{subtotal >= FREE_DELIVERY_AT ? 'Free' : formatPrice(DELIVERY_FEE)}</small></button></div><h3>Your details</h3><label className="field-label">Full name *<input required value={name} onChange={(event) => { setName(event.target.value); setCheckoutError(''); }} placeholder="Juan Dela Cruz" autoComplete="name" /></label><label className="field-label">Mobile number *<input required type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setCheckoutError(''); }} placeholder="09171234567" autoComplete="tel" /></label>{fulfillment === 'delivery' && <label className="field-label">Complete delivery address *<textarea required rows={3} value={address} onChange={(event) => { setAddress(event.target.value); setCheckoutError(''); }} placeholder="Street, barangay, city, landmarks" autoComplete="street-address" /></label>}<label className="field-label">Order notes (optional)<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="No onions, extra napkins..." /></label><div className="checkout-hint"><MapPin size={17} /> This is a frontend demo: no actual delivery or payment is processed.</div>{checkoutError && <div className="form-error" role="alert">{checkoutError}</div>}</div><div className="drawer-bottom"><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>{hasPromo && <div className="summary-row green"><span>Discount</span><strong>-{formatPrice(discount)}</strong></div>}<div className="summary-row"><span>Delivery fee</span><strong>{shipping ? formatPrice(shipping) : 'FREE'}</strong></div><div className="summary-row summary-total"><span>Total</span><strong>{formatPrice(total)}</strong></div><button type="submit" className="primary-button full-button">PLACE DEMO ORDER <ArrowRight size={19} /></button><small className="demo-disclaimer">No real order will be sent. Saved only on this device.</small></div></form></>}

          {view === 'success' && lastOrder && <><div className="modal-top"><h2>Order placed!</h2><button className="close-modal" aria-label="Close confirmation" onClick={() => setView(null)}><X size={23} /></button></div><div className="success-state"><div className="success-icon"><CheckCircle2 size={72} /></div><span className="modal-kicker">YOUR CRAVINGS ARE LOCKED IN</span><h3>THAT'S A WRAP! 🎉</h3><p>Thanks, {lastOrder.name}! Your demo order is saved on this device.</p><div className="success-receipt"><div><span>Order #</span><strong>{lastOrder.id}</strong></div><div><span>Order type</span><strong>{lastOrder.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</strong></div><div><span>Total</span><strong>{formatPrice(lastOrder.total)}</strong></div></div><button className="primary-button full-button" onClick={() => setView('orders')}>VIEW ORDER HISTORY <ArrowRight size={18} /></button><button className="continue-shopping" onClick={() => setView(null)}>Back to the menu</button></div></>}

          {view === 'orders' && <><div className="modal-top"><div><span className="modal-kicker">THE TASTY TIMELINE</span><h2>Past orders <em>({orders.length})</em></h2></div><button className="close-modal" aria-label="Close history" onClick={() => setView(null)}><X size={23} /></button></div>{orders.length ? <div className="drawer-scroll history-list">{orders.map((order) => <div className="order-card" key={order.id}><div className="order-card-top"><strong>{order.id}</strong><span className="order-status">DEMO ORDER</span></div><small>{new Date(order.date).toLocaleString('en-PH')} · {order.fulfillment}</small><p>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</p><div className="order-card-bottom"><b>{formatPrice(order.total)}</b><button onClick={() => reorder(order)}>Order again <ArrowRight size={16} /></button></div></div>)}</div> : <div className="drawer-empty"><span>🧾</span><h3>No orders yet</h3><p>Your demo order history will appear here after checkout.</p><button className="primary-button" onClick={() => setView(null)}>EXPLORE MENU <ArrowRight size={17} /></button></div>}</>}
        </div>
      </div>}
    </div>
  );
}

export default App;
