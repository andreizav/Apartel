
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../shared/api.service';
import { PortfolioService, InventoryCategory, InventoryItem } from '../shared/portfolio.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);

  // Consume shared state directly
  categories = this.portfolioService.inventory;

  // Filter out unit-specific items for the Master Inventory display
  displayCategories = computed(() => {
    return this.categories().map(cat => ({
      ...cat,
      items: cat.items.filter(item => !item.unitId)
    })).filter(cat => cat.items.length > 0 || !cat.id.startsWith('c-new'));
  });
  isModalOpen = signal(false);
  modalType = signal<'category' | 'item'>('item');
  targetCategoryId = signal<string | null>(null);
  targetItemId = signal<string | null>(null);
  newItemName = signal('');
  newItemPrice = signal<number>(0);


  // Actions

  deleteItem(categoryId: string, itemId: string) {
    if (!confirm('Delete this item?')) return;
    this.categories.update(cats =>
      cats.map(c => {
        if (c.id === categoryId) {
          return { ...c, items: c.items.filter(i => i.id !== itemId) };
        }
        return c;
      })
    );
    this.apiService.updateInventory(this.portfolioService.inventory()).subscribe();
  }

  deleteCategory(categoryId: string) {
    if (!confirm('Delete this entire category and all items?')) return;
    this.categories.update(cats => cats.filter(c => c.id !== categoryId));
    this.apiService.updateInventory(this.portfolioService.inventory()).subscribe();
  }

  // Modal Logic
  openAddCategory() {
    this.modalType.set('category');
    this.newItemName.set('');
    this.isModalOpen.set(true);
  }

  openAddItem(categoryId: string) {
    this.modalType.set('item');
    this.targetCategoryId.set(categoryId);
    this.newItemName.set('');
    this.newItemPrice.set(0);
    this.isModalOpen.set(true);
  }

  submitModal() {
    const name = this.newItemName().trim();
    if (!name) return;

    if (this.modalType() === 'category') {
      const newCat: InventoryCategory = {
        id: `c-${Date.now()}`,
        name: name,
        items: []
      };
      this.categories.update(cats => [newCat, ...cats]);
    } else {
      const catId = this.targetCategoryId();
      if (catId) {
        const newItem: InventoryItem = {
          id: `i-${Date.now()}`,
          name: name,
          quantity: 0,
          price: this.newItemPrice()
        };
        this.categories.update(cats =>
          cats.map(c => {
            if (c.id === catId) {
              return { ...c, items: [...c.items, newItem] };
            }
            return c;
          })
        );
      }
    }
    this.apiService.updateInventory(this.portfolioService.inventory()).subscribe();
    this.isModalOpen.set(false);
  }
}
