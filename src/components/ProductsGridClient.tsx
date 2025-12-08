"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image?: string | null;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

export default function ProductsGridClient({
  products,
  tenantSlug,
}: {
  products: Product[];
  tenantSlug: string;
}) {
  const [cartMap, setCartMap] = useState<Map<string, CartItem>>(new Map());
  const [loadingCart, setLoadingCart] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCart() {
      setLoadingCart(true);
      try {
        const res = await fetch(`/api/cart?tenantSlug=${tenantSlug}`);
        if (res.ok) {
          const items = await res.json();
          const map = new Map<string, CartItem>();
          items.forEach((it: any) => {
            map.set(it.productId, { id: it.id, productId: it.productId, quantity: it.quantity });
          });
          if (!cancelled) setCartMap(map);
        }
      } finally {
        if (!cancelled) setLoadingCart(false);
      }
    }
    loadCart();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const setQuantity = async (productId: string, nextQty: number) => {
    const current = cartMap.get(productId);
    if (!current) {
      // create new cart item via POST
      const res = await fetch(`/api/cart?tenantSlug=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: nextQty }),
      });
      if (res.ok) {
        const item = await res.json();
        const newMap = new Map(cartMap);
        newMap.set(productId, { id: item.id, productId, quantity: item.quantity });
        setCartMap(newMap);
        window.dispatchEvent(new Event("cartUpdated"));
      }
      return;
    }
    // update existing via PATCH
    const res = await fetch(`/api/cart/${current.id}?tenantSlug=${tenantSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-tenant-slug": tenantSlug },
      body: JSON.stringify({ quantity: nextQty }),
    });
    if (res.ok) {
      const item = await res.json();
      const newMap = new Map(cartMap);
      newMap.set(productId, { id: item.id, productId, quantity: item.quantity });
      setCartMap(newMap);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const removeItem = async (productId: string) => {
    const current = cartMap.get(productId);
    if (!current) return;
    const res = await fetch(`/api/cart/${current.id}?tenantSlug=${tenantSlug}`, {
      method: "DELETE",
      headers: { "x-tenant-slug": tenantSlug },
    });
    if (res.ok) {
      const newMap = new Map(cartMap);
      newMap.delete(productId);
      setCartMap(newMap);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const ci = cartMap.get(product.id);
        return (
          <ProductCard
            key={product.id}
            product={product}
            tenantSlug={tenantSlug}
            initialQuantity={ci?.quantity || 0}
            onIncrease={() => setQuantity(product.id, (ci?.quantity || 0) + 1)}
            onDecrease={() => {
              const q = (ci?.quantity || 0) - 1;
              if (q <= 0) removeItem(product.id);
              else setQuantity(product.id, q);
            }}
            onAdd={() => setQuantity(product.id, 1)}
          />
        );
      })}
    </div>
  );
}
