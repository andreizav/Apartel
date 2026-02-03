
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

  // Modal State
  isModalOpen = signal(false);
  modalType = signal<'category' | 'item' | 'refill'>('item');
  targetCategoryId = signal<string | null>(null);
  targetItemId = signal<string | null>(null);
  newItemName = signal('');
  newItemPrice = signal<number>(0);
  refillQuantity = signal<number>(0);


  // Actions
  openRefillModal(categoryId: string, item: InventoryItem) {
    this.modalType.set('refill');
    this.targetCategoryId.set(categoryId);
    this.targetItemId.set(item.id);
    this.newItemPrice.set(item.price ?? 0);
    this.refillQuantity.set(0);
    this.isModalOpen.set(true);
  }

  submitRefill() {
    const catId = this.targetCategoryId();
    const itemId = this.targetItemId();
    const qty = this.refillQuantity();
    const price = this.newItemPrice();

    if (!catId || !itemId) return;

    this.apiService.refillInventoryItem(catId, itemId, qty, price).subscribe((updatedInventory) => {
      // Optimistic update isn't strictly necessary if backend returns fresh data
      this.portfolioService.inventory.set(updatedInventory);
      this.isModalOpen.set(false);
    });
  }

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
