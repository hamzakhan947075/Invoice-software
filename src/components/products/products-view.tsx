"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/lib/currencies";
import { ProductFormDialog, type ProductRecord } from "@/components/products/product-form-dialog";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";

export function ProductsView({
  products,
  currency,
  searchQuery,
}: {
  products: ProductRecord[];
  currency: CurrencyCode;
  searchQuery: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting] = useState<ProductRecord | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Search products & services…" defaultValue={searchQuery} />
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add product or service
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Tax Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Package}
                    title={searchQuery ? "No items match your search" : "No products or services yet"}
                    description={
                      searchQuery
                        ? "Try a different name or SKU."
                        : "Add a product or service to your catalog to use it on invoices."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.name}
                    {product.description && (
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.type === "PRODUCT" ? "Product" : "Service"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.sku || "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(product.price, currency)}</TableCell>
                  <TableCell className="text-right">{Number(product.taxRate).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit item"
                        onClick={() => setEditing(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete item"
                        onClick={() => setDeleting(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog key="add" open={addOpen} onOpenChange={setAddOpen} />
      <ProductFormDialog
        key={editing?.id ?? "edit"}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        product={editing}
      />
      {deleting && (
        <DeleteProductDialog
          key={deleting.id}
          open={deleting !== null}
          onOpenChange={(open) => !open && setDeleting(null)}
          productId={deleting.id}
          productName={deleting.name}
        />
      )}
    </div>
  );
}
