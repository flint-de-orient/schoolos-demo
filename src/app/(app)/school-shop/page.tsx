'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { ShoppingCart, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import inventoryData from '@/data/shop-inventory.json';

type CartItem = { id: string; name: string; price: number; emoji: string; qty: number };

const defaultCart: CartItem[] = [
  { id: 'SHP007', name: 'Sundarban Academy Notebook Set (5 pcs)', price: 150, emoji: '📓', qty: 2 },
  { id: 'SHP008', name: 'Geometry Box (Premium)', price: 220, emoji: '📐', qty: 1 },
];

export default function SchoolShopPage() {
  const [activeCategory, setActiveCategory] = useState(inventoryData.categories[0]);
  const [cart, setCart] = useState<CartItem[]>(defaultCart);

  const filteredItems = inventoryData.items.filter(i => i.category === activeCategory);

  const addToCart = (item: typeof inventoryData.items[0]) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, qty: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const orders = [
    { date: '2025-04-08', student: 'Arjun Chatterjee', items: 'Notebook Set × 2, Geometry Box', total: 520, status: 'Delivered' },
    { date: '2025-04-05', student: 'Sneha Mukherjee', items: 'School Shirt (M), School Tie', total: 630, status: 'Processing' },
    { date: '2025-04-02', student: 'Tanvi Ghosh', items: 'Science Project Kit', total: 490, status: 'Delivered' },
    { date: '2025-03-28', student: 'Priya Sen', items: 'Backpack (Large), Water Bottle', total: 1600, status: 'Pending' },
  ];

  return (
    <PageWrapper>
      <div className="grid grid-cols-4 gap-5">
        {/* Products */}
        <div className="col-span-3">
          {/* Category Tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {inventoryData.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${activeCategory === cat ? 'bg-navy text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-navy/30 hover:text-navy'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all group">
                  <div className="w-full h-24 bg-iceLight rounded-xl flex items-center justify-center mb-3 text-4xl group-hover:scale-105 transition-transform">
                    {item.emoji}
                  </div>
                  <h4 className="font-semibold text-sm text-gray-800 leading-tight mb-1">{item.name}</h4>
                  {item.sizes && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {item.sizes.map(s => (
                        <span key={s} className="text-[9px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-sora font-bold text-navy">₹{item.price}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.stock > 20 ? 'bg-green/10 text-green' : item.stock > 5 ? 'bg-amber/10 text-amber' : 'bg-coral/10 text-coral'}`}>
                      {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                    </span>
                  </div>
                  <button
                    onClick={() => item.stock > 0 && addToCart(item)}
                    disabled={item.stock === 0}
                    className={`w-full mt-3 py-2 text-sm font-semibold rounded-xl transition-all ${
                      item.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      inCart ? 'bg-green/10 text-green border border-green/20' : 'bg-gold text-navy hover:bg-gold/90'
                    }`}
                  >
                    {inCart ? `✓ In Cart (${inCart.qty})` : 'Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-navy" />
              <h3 className="font-sora font-semibold text-navy">Cart ({cart.length})</h3>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="text-xl flex-shrink-0">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 leading-tight">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty} × ₹{item.price}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-coral transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 mb-4">
                  <div className="flex justify-between text-sm font-semibold text-gray-800">
                    <span>Subtotal</span>
                    <span className="text-navy">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCart([]);
                    toast.success('Order placed!', { description: 'Charged to parent wallet. Delivery in 2 days.' });
                  }}
                  className="w-full py-2.5 bg-gold text-navy font-semibold text-sm rounded-xl hover:bg-gold/90 transition-colors"
                >
                  Checkout & Pay
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">All charges to parent wallet</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Package className="w-5 h-5 text-navy" />
          <h3 className="font-sora font-semibold text-navy">Order History</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Date', 'Student', 'Items', 'Total', 'Status'].map(h => (
                <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                <td className="px-5 py-3 text-sm text-gray-500">{o.date}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-800">{o.student}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{o.items}</td>
                <td className="px-5 py-3 text-sm font-bold text-navy">₹{o.total.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    o.status === 'Delivered' ? 'bg-green/10 text-green' :
                    o.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber/10 text-amber'
                  }`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
