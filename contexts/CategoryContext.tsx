import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Category,
  loadCategories,
  addCategory as storageAddCategory,
  deleteCategory as storageDeleteCategory,
} from '@/utils/category-storage';

interface CategoryContextValue {
  categories: Category[];
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadCategories().then(cats => {
      console.log(`[CategoryContext] Loaded ${cats.length} categories`);
      setCategories(cats);
    });
  }, []);

  const addCategory = async (name: string) => {
    console.log(`[CategoryContext] addCategory: "${name}"`);
    const updated = await storageAddCategory(name);
    setCategories(updated);
  };

  const deleteCategory = async (id: string) => {
    console.log(`[CategoryContext] deleteCategory: id=${id}`);
    const updated = await storageDeleteCategory(id);
    setCategories(updated);
    if (selectedCategory === id) {
      setSelectedCategory('all');
    }
  };

  return (
    <CategoryContext.Provider
      value={{ categories, addCategory, deleteCategory, selectedCategory, setSelectedCategory }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory(): CategoryContextValue {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategory must be used within CategoryProvider');
  return ctx;
}
