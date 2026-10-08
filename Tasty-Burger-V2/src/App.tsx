import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Heart,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { burgerMenu } from './burgerData';
import type { BurgerCategory, BurgerItem, CartItem } from './burgerData';
import {
  addToCart,
  changeQuantity,
  formatPrice,
  getCartCount,
  getCartTotal,
  MAX_QUANTITY,
  removeFromCart,
} from './cartUtils';
import fallbackImage from './assets/burger-fallback.svg';
import './App.css';

type CategoryFilter = 'All' | BurgerCategory;
type DrawerView = 'cart' | 'checkout' | 'success' | 'orders' | null;

type SavedOrder = {
  id: string;
  customerName: string;
  phone: string;
  notes: string;
  date: string;
  items: CartItem[];
  total: number;
};

const CART_KEY = 'tastyBurger.cart.v1';
const FAVORITES_KEY = 'tastyBurger.favorites.v1';
const ORDERS_KEY = 'tastyBurger.orders.v1';
const categories: CategoryFilter[] = ['All', 'Beef', 'Chicken', 'Vegan'];

function readStoredValue(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function initialCart(): CartItem[] {
  const value = readStoredValue(CART_KEY);
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  // Restore only trusted menu data, not outdated or modified localStorage prices.
  for (const saved of value) {
    if (!saved || typeof saved.id !== 'number') continue;
    const burger = burgerMenu.find((item) => item.id === saved.id);
    if (!burger || result.some((item) => item.id === burger.id)) continue;
    const rawQuantity = Number(saved.quantity);
    const quantity = Number.isFinite(rawQuantity)
      ? Math.min(MAX_QUANTITY, Math.max(0, Math.floor(rawQuantity)))
      : 0;
    if (quantity > 0) result.push({ ...burger, quantity });
  }
  return result;
}

function initialFavorites(): number[] {
  const value = readStoredValue(FAVORITES_KEY);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is number =>
    typeof id === 'number' && burgerMenu.some((burger) => burger.id === id),
  ))];
}

function initialOrders(): SavedOrder[] {
  const value = readStoredValue(ORDERS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((order): order is SavedOrder =>
    !!order && typeof order.id === 'string' &&
    typeof order.customerName === 'string' && Array.isArray(order.items) &&
    typeof order.total === 'number' && Number.isFinite(order.total) &&
    typeof order.date === 'string',
  ).slice(0, 15);
}

function App() {
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [favorites, setFavorites] = useState<number[]>(initialFavorites);
  const [orders, setOrders] = useState<SavedOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>(null);
  const [lastOrder, setLastOrder] = useState<SavedOrder | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* Private browsing fallback */ }
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* Ignore disabled storage */ }
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch { /* Ignore disabled storage */ }
  }, [orders]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2700);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!drawerView) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerView(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKey);
    };
  }, [drawerView]);

  const filteredBurgers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return burgerMenu.filter((item) => {
      const searchMatch = !query ||
        `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase().includes(query);
      const categoryMatch = selectedCategory === 'All' || selectedCategory === item.category;
      const favoriteMatch = !showFavoritesOnly || favorites.includes(item.id);
      return searchMatch && categoryMatch && favoriteMatch;
    });
  }, [searchQuery, selectedCategory, showFavoritesOnly, favorites]);

  const totalCartCount = getCartCount(cart);
  const totalPrice = getCartTotal(cart);

  function toggleFavorite(id: number) {
    setFavorites((previous) => previous.includes(id)
      ? previous.filter((favId) => favId !== id)
      : [...previous, id]);
  }

  function handleAddToCart(burger: BurgerItem) {
    const found = cart.find((item) => item.id === burger.id);
    setCart((previous) => addToCart(previous, burger));
    setNotice(found?.quantity === MAX_QUANTITY
      ? `Maximum ${MAX_QUANTITY} per burger.`
      : `${burger.name} added to your cart!`);
  }

  function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart.length === 0) return;
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (!/^(09\d{9}|\+639\d{9})$/.test(cleanedPhone)) {
      setNotice('Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).');
      return;
    }

    // Frontend demo only: this does not send orders to a restaurant or charge money.
    const order: SavedOrder = {
      id: `TB-${Date.now().toString(36).toUpperCase()}`,
      customerName: customerName.trim(),
      phone: cleanedPhone,
      notes: notes.trim(),
      date: new Date().toISOString(),
      items: cart.map((item) => ({ ...item })),
      total: totalPrice,
    };
    if (!order.customerName) return;
    setOrders((previous) => [order, ...previous].slice(0, 15));
    setLastOrder(order);
    setCart([]);
    setCustomerName('');
    setPhone('');
    setNotes('');
    setDrawerView('success');
    setNotice('Demo order saved on this device.');
  }

  function resetFilters() {
    setSearchQuery('');
    setSelectedCategory('All');
    setShowFavoritesOnly(false);
  }

  return (
    <div className="app-shell">
      <div className="top-strip">BIG FLAVOR. BIGGER SMILES. <span>🍔</span> MADE WITH LOVE.</div>
      <nav className="navbar" aria-label="Main navigation">
        <div className="page-container nav-content">
          <a className="brand" href="#top" aria-label="Tasty Burger home">
            <span className="brand-emoji" aria-hidden="true">🍔</span>
            <span className="brand-words"><span>TASTY</span><strong>BURGER</strong></span>
          </a>
          <div className="nav-links">
            <a href="#about">ABOUT</a>
            <a className="active" href="#menu">OUR MENU</a>
            <a href="#shop">SHOP</a>
            <a href="#contact">CONTACT</a>
          </div>
          <div className="nav-actions">
            <button
              type="button"
              className={`icon-button ${showFavoritesOnly ? 'is-active' : ''}`}
              aria-label={showFavoritesOnly ? 'Show all burgers' : 'Show favorite burgers'}
              title="Favorites"
              onClick={() => {
                setShowFavoritesOnly((value) => !value);
                document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Heart size={22} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
              {favorites.length > 0 && <span className="counter-bubble">{favorites.length}</span>}
            </button>
            <button type="button" className="icon-button history-trigger" title="Demo order history" aria-label="Order history" onClick={() => setDrawerView('orders')}>
              <ReceiptText size={22} />
            </button>
            <button type="button" className="cart-trigger" onClick={() => setDrawerView('cart')} aria-label={`Open cart, ${totalCartCount} items`}>
              <ShoppingBag size={20} /> <span className="cart-trigger-label">CART</span>
              <span className="cart-counter">{totalCartCount}</span>
            </button>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="hero-section page-container" id="about" aria-labelledby="hero-heading">
          <div className="hero-decor hero-decor-left" aria-hidden="true">✳</div>
          <div className="hero-decor hero-decor-right" aria-hidden="true">✳</div>
          <span className="eyebrow"><Sparkles size={15} /> FRESH, FUN & FULL OF FLAVOR</span>
          <h1 id="hero-heading">OUR CRAZY <span>BURGERS</span></h1>
          <p>Get ready for a wild ride of flavors! Our crazy burgers are loaded with juicy patties, bold toppings, and irresistible sauces, all stacked on a perfectly toasted bun. Whether you like it cheesy or extra meaty, we've got a burger that will blow your mind!</p>
          <a href="#menu" className="hero-cta">EXPLORE THE MENU <ArrowRight size={18} /></a>
          <div className="hero-caption"><span className="caption-dot" /> YOUR NEXT FAVORITE BITE AWAITS</div>
        </section>

        <section id="menu" className="menu-section page-container" aria-labelledby="menu-heading">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PICK YOUR CRAVING</span>
              <h2 id="menu-heading">THE BURGER LINEUP<span className="heading-star"> ✳</span></h2>
            </div>
            <span className="results-count">{filteredBurgers.length} {filteredBurgers.length === 1 ? 'burger' : 'burgers'} to discover</span>
          </div>
          <div className="controls-section">
            <div className="category-buttons" aria-label="Filter by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-btn ${category === selectedCategory ? 'active' : ''}`}
                  aria-pressed={category === selectedCategory}
                  onClick={() => setSelectedCategory(category)}
                >{category === 'All' ? 'All Burgers' : category}</button>
              ))}
            </div>
            <label className="search-field">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search burgers</span>
              <input type="search" placeholder="Search your craving..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </label>
          </div>
          {showFavoritesOnly && (
            <div className="active-filter-bar">
              <Heart size={16} fill="currentColor" /> Showing your favorites
              <button type="button" onClick={() => setShowFavoritesOnly(false)}>Show all <X size={15} /></button>
            </div>
          )}
          <div id="shop" className="menu-grid">
            {filteredBurgers.map((item) => {
              const favorite = favorites.includes(item.id);
              return (
                <article className="burger-card" key={item.id}>
                  <div className="image-container">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="burger-img"
                      loading="lazy"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackImage; }}
                    />
                    <span className="image-category">{item.category}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-top-row">
                      <div className="star-rating" aria-label={`${item.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star size={16} key={index} className={index < item.rating ? 'star-filled' : 'star-empty'} fill={index < item.rating ? 'currentColor' : 'none'} />
                        ))}
                        <span className="rating-numeric">{item.rating.toFixed(1)}</span>
                      </div>
                      <button
                        type="button"
                        aria-label={favorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                        aria-pressed={favorite}
                        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                        className={`heart-btn ${favorite ? 'favorited' : ''}`}
                        onClick={() => toggleFavorite(item.id)}
                      ><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button>
                    </div>
                    <h3 className="burger-title">{item.name}</h3>
                    <p className="burger-desc">{item.description}</p>
                    <div className="card-bottom-row">
                      <strong className="price-tag">{formatPrice(item.price)}</strong>
                      <button type="button" className="add-button" onClick={() => handleAddToCart(item)}>
                        <Plus size={17} /> ADD TO CART
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredBurgers.length === 0 && (
            <div className="no-results">
              <span aria-hidden="true">🍔</span>
              <h3>No burgers found</h3>
              <p>Nothing matches your filters. Try another craving!</p>
              <button className="reset-button" type="button" onClick={resetFilters}><RotateCcw size={17} /> Reset filters</button>
            </div>
          )}
        </section>

        <section className="bottom-banner page-container" id="contact">
          <div className="banner-symbol" aria-hidden="true">✳</div>
          <div><span className="section-kicker">LOVE AT FIRST BITE</span><h2>GOOD FOOD. GOOD MOOD.</h2><p>Choose your favorites and place a demo pickup order right here.</p></div>
          <a href="#menu" className="banner-button">FIND YOUR BURGER <ArrowRight size={18} /></a>
        </section>
      </main>
      <footer className="footer page-container"><span>© {new Date().getFullYear()} TASTY BURGER</span><span>Made for burger lovers. This is a frontend demo, not a live restaurant ordering service.</span></footer>

      {notice && <div className="toast" role="status"><CheckCircle2 size={19} /> {notice}</div>}
      {drawerView && (
        <div className="drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerView(null); }}>
          <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <header className="drawer-header">
              <div>
                <span className="drawer-kicker">TASTY BURGER</span>
                <h2 id="drawer-title">{drawerView === 'cart' ? 'YOUR CART' : drawerView === 'checkout' ? 'CHECKOUT' : drawerView === 'orders' ? 'ORDER HISTORY' : 'ORDER PLACED!'}</h2>
              </div>
              <button type="button" className="drawer-close" aria-label="Close panel" onClick={() => setDrawerView(null)}><X size={22} /></button>
            </header>

            {drawerView === 'cart' && (
              <>
                {cart.length === 0 ? (
                  <div className="drawer-empty"><ShoppingBag size={54} /><h3>Your cart is empty</h3><p>Your burger adventure starts with a single bite.</p><button className="primary-button" onClick={() => setDrawerView(null)}>BROWSE BURGERS <ArrowRight size={17} /></button></div>
                ) : (
                  <>
                    <div className="drawer-scrollable">
                      <p className="drawer-intro">Hungry already? Review your delicious picks below.</p>
                      {cart.map((item) => (
                        <div className="cart-item" key={item.id}>
                          <img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackImage; }} />
                          <div className="cart-item-details"><h3>{item.name}</h3><p>{formatPrice(item.price)} each</p><div className="qty-controls">
                            <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setCart((prev) => changeQuantity(prev, item.id, -1))}><Minus size={15} /></button>
                            <span>{item.quantity}</span>
                            <button type="button" aria-label={`Increase ${item.name}`} disabled={item.quantity >= MAX_QUANTITY} onClick={() => setCart((prev) => changeQuantity(prev, item.id, 1))}><Plus size={15} /></button>
                          </div></div>
                          <div className="cart-item-right"><strong>{formatPrice(item.price * item.quantity)}</strong><button type="button" aria-label={`Remove ${item.name}`} onClick={() => setCart((prev) => removeFromCart(prev, item.id))}><Trash2 size={18} /></button></div>
                        </div>
                      ))}
                      <button type="button" className="text-button" onClick={() => { setCart([]); setNotice('Cart cleared.'); }}>Clear entire cart</button>
                    </div>
                    <div className="drawer-footer">
                      <div className="total-line"><span>Items ({totalCartCount})</span><span>{formatPrice(totalPrice)}</span></div>
                      <div className="total-line total-grand"><strong>Total</strong><strong>{formatPrice(totalPrice)}</strong></div>
                      <p className="cart-disclaimer">Demo pickup order • No real payment is collected</p>
                      <button type="button" className="primary-button full-width" onClick={() => setDrawerView('checkout')}>PROCEED TO CHECKOUT <ArrowRight size={18} /></button>
                    </div>
                  </>
                )}
              </>
            )}

            {drawerView === 'checkout' && (
              <>
                <form id="checkout-form" className="checkout-form drawer-scrollable" onSubmit={handleCheckout}>
                  <button type="button" className="back-button" onClick={() => setDrawerView('cart')}><ArrowLeft size={16} /> Back to cart</button>
                  <p className="form-note"><Clock3 size={17} /> Pickup only • Pay on pickup (demo)</p>
                  <label htmlFor="customer-name">Full name <span>*</span></label>
                  <input id="customer-name" type="text" autoComplete="name" required minLength={2} maxLength={80} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Your full name" />
                  <label htmlFor="customer-phone">Mobile number <span>*</span></label>
                  <input id="customer-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09XXXXXXXXX" title="Enter 09XXXXXXXXX or +639XXXXXXXXX" pattern="(09[0-9]{9}|\+639[0-9]{9})" />
                  <label htmlFor="customer-notes">Special instructions <small>(optional)</small></label>
                  <textarea id="customer-notes" rows={4} maxLength={300} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any special requests for your burger?" />
                  <p className="checkout-hint">This is a sample order form. No order is submitted to a real restaurant and no payment is charged.</p>
                </form>
                <div className="drawer-footer">
                  <div className="total-line total-grand"><strong>Total ({totalCartCount} items)</strong><strong>{formatPrice(totalPrice)}</strong></div>
                  <button type="submit" form="checkout-form" disabled={!cart.length} className="primary-button full-width">PLACE DEMO ORDER <ArrowRight size={18} /></button>
                </div>
              </>
            )}

            {drawerView === 'success' && lastOrder && (
              <div className="success-view drawer-scrollable">
                <div className="success-icon"><CheckCircle2 size={60} /></div>
                <h3>You're all set, {lastOrder.customerName.split(' ')[0]}!</h3>
                <p>Your sample order was saved on this device. Thanks for choosing Tasty Burger!</p>
                <div className="success-receipt"><span>DEMO ORDER NUMBER</span><strong>{lastOrder.id}</strong><div className="total-line"><span>{lastOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items</span><strong>{formatPrice(lastOrder.total)}</strong></div></div>
                <p className="checkout-hint">No restaurant received this order. This is only a frontend demo.</p>
                <button type="button" className="primary-button full-width" onClick={() => setDrawerView('orders')}>VIEW ORDER HISTORY <ArrowRight size={18} /></button>
                <button type="button" className="secondary-button full-width" onClick={() => setDrawerView(null)}>CONTINUE BROWSING</button>
              </div>
            )}

            {drawerView === 'orders' && (
              <div className="order-history drawer-scrollable">
                {orders.length === 0 ? (
                  <div className="drawer-empty"><ReceiptText size={54} /><h3>No demo orders yet</h3><p>Your saved demo orders will appear here after checkout.</p><button type="button" className="primary-button" onClick={() => setDrawerView(null)}>BROWSE BURGERS</button></div>
                ) : (
                  <><p className="drawer-intro">Saved locally in this browser (up to 15 demo orders).</p>
                    {orders.map((order) => (
                      <article className="order-history-item" key={order.id}>
                        <div className="order-history-top"><strong>{order.id}</strong><span>{new Date(order.date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span></div>
                        <p>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</p>
                        <div className="order-history-total"><span>DEMO / PICKUP</span><strong>{formatPrice(order.total)}</strong></div>
                      </article>
                    ))}
                    <button type="button" className="text-button history-clear" onClick={() => { if (window.confirm('Delete your local demo order history?')) setOrders([]); }}>Clear order history</button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
