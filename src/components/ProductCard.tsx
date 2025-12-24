"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    category: string;
    image?: string | null;
  };
  tenantSlug: string;
}

export default function ProductCard({
  product,
  tenantSlug,
  initialQuantity = 0,
  onIncrease,
  onDecrease,
  onAdd,
}: ProductCardProps & {
  initialQuantity?: number;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onAdd?: () => void;
}) {
  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    if (onAdd) {
      await onAdd();
      toast.success(`${product.name} added to cart`);
    }
  };

  return (
    <Link href={`/${tenantSlug}/products/${product.id}`}>
      <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col cursor-pointer">
        <div className="h-48 bg-white flex items-center justify-center relative overflow-hidden">
          <Badge className="absolute top-4 left-4 bg-white/90 text-gray-900 hover:bg-white shadow-sm backdrop-blur-sm z-10 capitalize">
            {product.category}
          </Badge>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <span className="text-8xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
              🍎
            </span>
          )}
        </div>
        <CardContent className="p-5 flex-grow">
          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description || ""}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-700">₹{product.price}</span>
            {product.stock > 0 ? (
              <Badge variant="outline" className="text-green-700 border-green-700">
                In Stock
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-700 border-red-700">
                Out of Stock
              </Badge>
            )}
          </div>
          <div className="mt-4">
            {initialQuantity > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDecrease && onDecrease();
                  }}
                >
                  -
                </Button>
                <span className="min-w-8 text-center font-medium">{initialQuantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onIncrease && onIncrease();
                  }}
                  disabled={initialQuantity >= product.stock}
                >
                  +
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={addToCart}
                disabled={product.stock <= 0}
                className="w-full flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
