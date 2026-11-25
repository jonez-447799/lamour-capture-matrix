import React, { useState, useEffect } from 'react';
import type { IncomingMessage, ServerResponse } from 'http';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: 'chain' | 'charm' | 'jewelry';
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'chain' | 'charm' | 'jewelry';
  description: string;
}

export function useLamourCart() {
  const STORAGE_KEY = 'lamourflux_cart';
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  const addItem = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const charmCount = cart
    .filter((item) => item.category === 'charm')
    .reduce((acc, item) => acc + item.quantity, 0);

  const discountRate = charmCount >= 3 ? 0.10 : 0;
  const discountAmount = subtotal * discountRate;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  return { cart, addItem, removeItem, updateQuantity, clearCart, subtotal, discountAmount, discountRate, grandTotal };
}

export function LamourBadge({ children, variant = 'amber' }: { children: React.ReactNode; variant?: 'amber' | 'slate' | 'obsidian' }) {
  const styles = {
    amber: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    obsidian: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>{children}</span>;
}

export function LamourButton({ children, onClick, variant = 'primary', disabled = false, className = '' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; className?: string; }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-50';
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 font-semibold',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    danger: 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/50',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
}

export function LamourProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product) => void }) {
  return (
    <div className="bg-zinc-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 shadow-xl backdrop-blur-sm transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-slate-100">{product.name}</h3>
          <LamourBadge variant={product.category === 'charm' ? 'amber' : 'slate'}>{product.category}</LamourBadge>
        </div>
        <p className="text-sm text-slate-400 mb-4">{product.description}</p>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
        <span className="text-xl font-bold text-amber-400">${product.price.toFixed(2)}</span>
        <LamourButton onClick={() => onAddToCart(product)} variant="primary">Add to Cart</LamourButton>
      </div>
    </div>
  );
}

export function LamourCartSummary({ subtotal, discountAmount, grandTotal, onCheckout }: { subtotal: number; discountAmount: number; grandTotal: number; onCheckout: () => void; }) {
  return (
    <div className="bg-zinc-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-200">
      <h2 className="text-xl font-bold text-amber-400 mb-4 border-b border-slate-800 pb-2">Order Summary</h2>
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-amber-400 font-medium">
            <span>Modular Charm Bundle (10% Off)</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-slate-100 pt-3 border-t border-slate-800">
          <span>Grand Total</span>
          <span className="text-amber-400">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
      <LamourButton onClick={onCheckout} variant="primary" className="w-full text-center">Proceed to Checkout</LamourButton>
    </div>
  );
}

export const catalogData: Product[] = [
  { id: 'c1', name: 'Obsidian Snake Chain', price: 120.0, category: 'chain', description: 'Anti-tarnish dark PVD obsidian coated stainless steel chain.' },
  { id: 'm1', name: 'Lunar Eclipse Charm', price: 45.0, category: 'charm', description: 'Modular midnight black obsidian pendant with amber inlay.' },
  { id: 'm2', name: 'Solstice Sun Charm', price: 50.0, category: 'charm', description: 'Brushed amber gold modular charm.' },
  { id: 'm3', name: 'Serpent Coil Charm', price: 40.0, category: 'charm', description: 'Detailed slate-accented anti-tarnish modular charm.' },
];

export function handleCloudRunRequest(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  if (req.method === 'GET' && url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.method === 'GET' && url === '/api/v1/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ catalog: catalogData }));
    return;
  }

  if (req.method === 'POST' && url === '/api/v1/cart/checkout') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { items } = JSON.parse(body || '{}') as { items: CartItem[] };
        const subtotal = (items || []).reduce((acc, item) => acc + item.price * item.quantity, 0);
        const charmCount = (items || []).filter((item) => item.category === 'charm').reduce((acc, item) => acc + item.quantity, 0);
        const discountRate = charmCount >= 3 ? 0.10 : 0;
        const discountAmount = subtotal * discountRate;
        const grandTotal = Math.max(0, subtotal - discountAmount);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ subtotal, discountAmount, discountRate, grandTotal, itemCount: items?.length || 0, status: 'validated' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

if (typeof process !== 'undefined' && process.env && require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 8080;
  const server = http.createServer(handleCloudRunRequest);
  server.listen(PORT, () => {
    console.log(`Lamourflux Cloud Run API listening on port ${PORT}`);
  });
}
