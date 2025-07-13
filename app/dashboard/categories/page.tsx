"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  Layers,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface CategoryWithDetails extends Category {
  parent_name?: string;
  products_count?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log("Fetching categories...");

      // First, get all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoriesError) {
        console.error("Categories error:", categoriesError);
        throw categoriesError;
      }

      if (!categoriesData) {
        setCategories([]);
        return;
      }

      // Then get parent names and product counts
      const categoriesWithDetails = await Promise.all(
        categoriesData.map(async (category) => {
          try {
            let parent_name = null;

            // Get parent name if exists
            if (category.parent_id) {
              const { data: parentData } = await supabase
                .from("categories")
                .select("name")
                .eq("id", category.parent_id)
                .single();

              parent_name = parentData?.name || null;
            }

            // Get product count
            const { count } = await supabase
              .from("products")
              .select("*", { count: "exact", head: true })
              .eq("category_id", category.id);

            return {
              ...category,
              parent_name,
              products_count: count || 0,
            };
          } catch (error) {
            console.error(`Error processing category ${category.id}:`, error);
            return {
              ...category,
              parent_name: null,
              products_count: 0,
            };
          }
        })
      );

      setCategories(categoriesWithDetails);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      // إزالة الفئة من القائمة محلياً
      setCategories((prev) =>
        prev.filter((category) => category.id !== categoryId)
      );

      alert("Category deleted successfully!");
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Error deleting category");
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "main" && !category.parent_id) ||
      (typeFilter === "sub" && category.parent_id);

    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground">Manage your product categories</p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading categories
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button onClick={fetchCategories} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground">Manage your product categories</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">
            {filteredCategories.length} categories
          </Badge>
          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/dashboard/categories/add">
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="main">Main Categories</SelectItem>
            <SelectItem value="sub">Sub Categories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories Table */}
      <div className="bg-card rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                      {typeof category.logo_url === "string" &&
                      category.logo_url.startsWith("http") ? (
                        <img
                          src={category.logo_url || "/placeholder.svg"}
                          alt={category.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span>{category.logo_url || "📁"}</span>
                      )}
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={category.parent_id ? "secondary" : "default"}>
                    {category.parent_id ? "Sub Category" : "Main Category"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {category.products_count} products
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {category.description || "No description"}
                </TableCell>
                <TableCell>{formatDate(category.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/categories/${category.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/categories/edit/${category.id}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Categories will appear here when you create them"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredCategories.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredCategories.length} of {categories.length}{" "}
                categories
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 text-white"
              >
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
