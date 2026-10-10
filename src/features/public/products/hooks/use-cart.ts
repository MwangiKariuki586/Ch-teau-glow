"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ShopCartItem,
  readCartStorage,
  subscribeToCartUpdates,
  writeCartStorage,
} from "@/features/public/shop/lib/cart";

export type CartItem = ShopCartItem;

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCartStorage());

    return subscribeToCartUpdates(() => {
      setItems(readCartStorage());
    });
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    writeCartStorage(next);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      const next = existing
        ? prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
          )
        : [...prev, { ...item, quantity: qty }];
      writeCartStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      writeCartStorage(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) => {
      const next = prev.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      );
      writeCartStorage(next);
      return next;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => persist([]), [persist]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQty, clearCart, totalItems };
}
