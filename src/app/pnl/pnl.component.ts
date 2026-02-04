import { Component, signal, computed, effect, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { ApiService } from '../shared/api.service';
import { PortfolioService, Transaction } from '../shared/portfolio.service';

interface ProcessedTransaction extends Transaction {
  convertedAmount: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subCategories: { id: string; name: string }[];
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  type: 'income' | 'expense';
  children: { name: string; amount: number }[];
  expanded: boolean;
}

@Component({
  selector: 'app-pnl',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pnl.component.html',
})
export class PnLComponent {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);

  selectedCurrency = signal<'USD' | 'UAH' | 'EUR'>('USD');
  filterMode = signal<'month' | 'year' | 'all'>('month');
  currentDate = signal(new Date());

  exchangeRates = this.portfolioService.exchangeRates;

  properties = [
    'Art Apartments', 'Stylish Apartments', 'Boutique Apartments', 'Lesi 3',
    'S45', 'Basseynaya', 'Kreschatyk', 'Story Apartments', 'Panorama', 'Office'
  ];

  categories = signal<Category[]>([]);

  transactions = this.portfolioService.transactions;

  importPreviewData = signal<Transaction[]>([]);
  isImportModalOpen = signal(false);
  isModalOpen = signal(false);

  newTransaction = signal<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    property: 'General',
    type: 'expense',
    category: '',
    subCategory: ''
  });

  isDownloadMenuOpen = signal(false);

  canSaveTransaction = computed(() => {
    const t = this.newTransaction();
    const hasSubs = this.availableSubCategories().length > 0;
    return !!t.category && (hasSubs ? !!t.subCategory : true) && !!t.amount && t.amount > 0;
  });

  constructor() {
    this.fetchLiveRates();
    this.loadCategories();
  }

  loadCategories() {
    this.apiService.getCategories().subscribe(res => {
      // Map API response to match Category interface
      const cats: Category[] = res.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        subCategories: r.subCategories || []
      }));
      this.categories.set(cats);
    });
  }

  async fetchLiveRates() {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data && data.rates) {
        this.exchangeRates.update(current => ({
          ...current,
          UAH: data.rates.UAH || current['UAH'],
          EUR: data.rates.EUR || current['EUR'],
          USD: 1
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch live rates, using defaults.', error);
    }
  }

  dateLabel = computed(() => {
    const date = this.currentDate();
    const mode = this.filterMode();
    if (mode === 'all') return 'All Time';
    if (mode === 'year') return date.getFullYear().toString();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  processedTransactions = computed<ProcessedTransaction[]>(() => {
    const targetCurrency = this.selectedCurrency();
    const rates = this.exchangeRates();
    const txs = this.transactions();

    const mode = this.filterMode();
    const current = this.currentDate();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();

    const filteredTxs = txs.filter(t => {
      if (mode === 'all') return true;
      const tDate = new Date(t.date);
      const tYear = tDate.getFullYear();
      if (mode === 'year') return tYear === currentYear;
      const tMonth = tDate.getMonth();
      return tYear === currentYear && tMonth === currentMonth;
    });

    return filteredTxs.map(t => {
      const rateSource = rates[t.currency] || 1;
      const rateTarget = rates[targetCurrency] || 1;
      const converted = t.amount * (rateTarget / rateSource);
      return { ...t, convertedAmount: converted };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  totalRevenue = computed(() => this.processedTransactions().filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0));
  totalExpenses = computed(() => this.processedTransactions().filter(t => t.type === 'expense').reduce((sum, t) => sum + t.convertedAmount, 0));
  netProfit = computed(() => this.totalRevenue() - this.totalExpenses());
  margin = computed(() => {
    const rev = this.totalRevenue();
    return rev === 0 ? 0 : ((rev - this.totalExpenses()) / rev) * 100;
  });
  transactionCount = computed(() => this.processedTransactions().length);

  categoryBreakdown = computed(() => {
    const txs = this.processedTransactions();
    const groups: { [key: string]: CategoryBreakdown } = {};
    txs.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = { name: t.category, amount: 0, type: t.type, children: [], expanded: true };
      }
      groups[t.category].amount += t.convertedAmount;
      const child = groups[t.category].children.find(c => c.name === t.subCategory);
      if (child) child.amount += t.convertedAmount;
      else groups[t.category].children.push({ name: t.subCategory || 'General', amount: t.convertedAmount });
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  });

  availableCategories = computed(() => this.categories().filter(c => c.type === this.newTransaction().type));
  availableSubCategories = computed(() => {
    const catName = this.newTransaction().category;
    const cat = this.categories().find(c => c.name === catName);
    return cat ? cat.subCategories.map(s => s.name) : [];
  });

  expandedCategories = signal<Map<string, boolean>>(new Map());
  toggleCategory(catName: string) {
    this.expandedCategories.update(m => new Map(m).set(catName, !(m.get(catName) ?? true)));
  }
  isExpanded(catName: string): boolean {
    return this.expandedCategories().get(catName) ?? true;
  }

  setCurrency(cur: 'USD' | 'UAH' | 'EUR') { this.selectedCurrency.set(cur); }
  setFilterMode(mode: 'month' | 'year' | 'all') { this.filterMode.set(mode); }
  prevPeriod() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      if (this.filterMode() === 'year') newDate.setFullYear(d.getFullYear() - 1);
      else newDate.setMonth(d.getMonth() - 1);
      return newDate;
    });
  }
  nextPeriod() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      if (this.filterMode() === 'year') newDate.setFullYear(d.getFullYear() + 1);
      else newDate.setMonth(d.getMonth() + 1);
      return newDate;
    });
  }

  toggleDownloadMenu() { this.isDownloadMenuOpen.update(v => !v); }

  downloadReport(format: 'xlsx' | 'json') {
    this.isDownloadMenuOpen.set(false);
    const data = this.processedTransactions();
    const filename = `PnL_Report_${this.dateLabel().replace(/\s/g, '_')}_${this.selectedCurrency()}`;

    if (format === 'json') {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const exportData = data.map(t => ({
        ID: t.id, Date: t.date, Type: t.type, Property: t.property, Category: t.category, SubCategory: t.subCategory, Description: t.description, OriginalAmount: t.amount, OriginalCurrency: t.currency, ConvertedAmount: t.convertedAmount, ReportCurrency: this.selectedCurrency()
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  }

  openAddModal() {
    this.newTransaction.set({ date: new Date().toISOString().split('T')[0], currency: this.selectedCurrency(), property: 'General', type: 'expense', category: '', subCategory: '', amount: 0, description: '' });
    this.isModalOpen.set(true);
  }

  saveTransaction() {
    if (!this.canSaveTransaction()) return;

    const t = this.newTransaction();
    const newTx: Transaction = {
      id: `t-${Date.now()}`, date: t.date!, property: t.property!, category: t.category!, subCategory: t.subCategory || 'General', description: t.description || '', amount: t.amount!, currency: t.currency as any, type: t.type as any
    };
    this.apiService.addTransaction(newTx);
    this.isModalOpen.set(false);
  }

  updateNewTx(field: keyof Transaction, value: any) {
    this.newTransaction.update(prev => ({ ...prev, [field]: value }));
    if (field === 'type') {
      this.updateNewTx('category', '');
      this.updateNewTx('subCategory', '');
    }
    if (field === 'category') {
      this.updateNewTx('subCategory', '');
    }
  }

  getCurrencySymbol(cur: string) {
    switch (cur) { case 'EUR': return '€'; case 'UAH': return '₴'; default: return '$'; }
  }

  handleImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData && jsonData.length > 0) this.parseImportData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
    target.value = '';
  }

  private parseImportData(rows: any[][]) {
    const newTransactions: Transaction[] = [];
    let startIndex = 0;
    let formatType: 'export' | 'specific' | 'generic' = 'generic';

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const rowSig = row.map(c => c ? c.toString().toLowerCase().trim() : '');
      if (rowSig.includes('originalamount') && rowSig.includes('date')) {
        startIndex = i + 1; formatType = 'export'; break;
      } else if (rowSig.includes('item of p&l')) {
        startIndex = i + 1; formatType = 'specific'; break;
      }
    }

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      let rawDate, property, category, subCategory, description, amount, currency, type;

      if (formatType === 'export') {
        rawDate = row[1];
        const rawType = row[2] ? row[2].toString().toLowerCase() : '';
        property = row[3]; category = row[4]; subCategory = row[5]; description = row[6];
        amount = this.parseNumber(row[7]); currency = this.parseCurrency(row[8]);
        type = rawType.includes('income') ? 'income' : 'expense';
      } else if (formatType === 'specific') {
        rawDate = row[0];
        property = row[2] || row[3] || 'General';
        category = row[5]; subCategory = row[6]; description = row[7];
        const amountInput = this.parseNumber(row[8]);
        const amountOutput = this.parseNumber(row[9]);
        if (amountInput > 0) { amount = amountInput; type = 'income'; }
        else if (amountOutput > 0) { amount = amountOutput; type = 'expense'; }
        else continue;
        currency = this.parseCurrency(row[10]);
      } else {
        rawDate = row[0];
        property = row[2] || row[3] || 'General';
        category = row[5] || 'Uncategorized';
        subCategory = row[6] || row[4] || 'General';
        description = row[7] || '';
        amount = this.parseNumber(row[8]) || this.parseNumber(row[7]);
        currency = this.parseCurrency(row[10]);
        type = (category && category.toString().toLowerCase().includes('income')) ? 'income' : 'expense';
      }

      const dateStr = this.parseDate(rawDate);
      if (amount !== undefined && amount !== null && !isNaN(amount)) {
        newTransactions.push({
          id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          date: dateStr,
          property: property ? property.toString().trim() : 'General',
          category: category ? category.toString().trim() : 'Uncategorized',
          subCategory: subCategory ? subCategory.toString().trim() : '',
          description: description ? description.toString().trim() : '',
          amount: amount, currency: currency, type: type as 'income' | 'expense'
        });
      }
    }

    if (newTransactions.length > 0) {
      this.importPreviewData.set(newTransactions);
      this.isImportModalOpen.set(true);
    } else {
      alert('No valid transactions found.');
    }
  }

  private parseNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let clean = val.replace(/[$€£\s]/g, '');
      if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(/,/g, '.');
      else if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  private parseCurrency(val: any): 'USD' | 'UAH' | 'EUR' {
    const s = val ? val.toString().toUpperCase() : '';
    if (s.includes('USD')) return 'USD';
    if (s.includes('EUR')) return 'EUR';
    return 'UAH';
  }

  private parseDate(val: any): string {
    if (val instanceof Date) return new Date(val.getTime() - (val.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (typeof val === 'number' && val > 20000) return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().split('T')[0];
    if (typeof val === 'string') {
      const parts = val.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let d = parseInt(parts[1]), m = parseInt(parts[0]), y = parseInt(parts[2]);
        if (m > 12) { const t = d; d = m; m = t; }
        if (y < 100) y += 2000;
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  async saveImport() {
    const data = this.importPreviewData();
    const currentCats = this.categories();

    // 1. Identify missing Categories
    const uniqueCats = new Map<string, 'income' | 'expense'>();
    data.forEach(t => {
      if (t.category && t.category !== 'Uncategorized' && !currentCats.find(c => c.name === t.category && c.type === t.type)) {
        uniqueCats.set(t.category, t.type as 'income' | 'expense');
      }
    });

    // 2. Create missing Categories
    for (const [name, type] of uniqueCats.entries()) {
      try {
        await lastValueFrom(this.apiService.createCategory(name, type));
      } catch (e) {
        console.error(`Failed to create category ${name}`, e);
      }
    }

    // 3. Refresh Categories to get IDs
    let freshCats: Category[] = [];
    try {
      const res = await lastValueFrom(this.apiService.getCategories());
      freshCats = res.map(r => ({
        id: r.id, name: r.name, type: r.type, subCategories: r.subCategories || []
      }));
      this.categories.set(freshCats);
    } catch (e) { console.error('Failed to refresh categories', e); }

    // 4. Identify missing SubCategories
    const uniqueSubs = new Set<string>();
    const subsToCreate: { catId: string, name: string }[] = [];

    data.forEach(t => {
      if (!t.category || !t.subCategory || t.subCategory === 'General') return;
      const cat = freshCats.find(c => c.name === t.category && c.type === t.type);
      if (cat) {
        const subExists = cat.subCategories.find(s => s.name === t.subCategory);
        if (!subExists) {
          const key = `${t.category}|${t.subCategory}`;
          if (!uniqueSubs.has(key)) {
            uniqueSubs.add(key);
            subsToCreate.push({ catId: cat.id, name: t.subCategory });
          }
        }
      }
    });

    // 5. Create missing SubCategories
    for (const sub of subsToCreate) {
      try {
        await lastValueFrom(this.apiService.createSubCategory(sub.catId, sub.name));
      } catch (e) { console.error('Failed to create subcategory', sub.name, e); }
    }

    // 6. Save Transactions
    data.forEach(t => this.apiService.addTransaction(t));
    this.importPreviewData.set([]);
    this.isImportModalOpen.set(false);

    // Final Load
    this.loadCategories();
  }

  cancelImport() {
    this.importPreviewData.set([]);
    this.isImportModalOpen.set(false);
  }

  updatePreviewItem(index: number, field: keyof Transaction, value: any) {
    this.importPreviewData.update(data => {
      const updated = [...data];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  removePreviewItem(index: number) {
    this.importPreviewData.update(data => data.filter((_, i) => i !== index));
  }

  // Category Management
  isManageCategoriesOpen = signal(false);
  newCategoryName = signal('');
  newCategoryType = signal<'income' | 'expense'>('expense');
  newSubCategoryName = signal('');
  selectedCategoryForSub = signal<string | null>(null);

  editingCategoryId = signal<string | null>(null);
  editingCategoryName = signal('');
  editingCategoryType = signal<'income' | 'expense'>('expense');

  editingSubCategoryId = signal<string | null>(null);
  editingSubCategoryName = signal('');

  openManageCategories() {
    this.isManageCategoriesOpen.set(true);
  }

  addCategory() {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.apiService.createCategory(name, this.newCategoryType()).subscribe({
      next: () => {
        this.newCategoryName.set('');
        this.loadCategories();
      },
      error: (err) => alert('Failed to create category: ' + err.message)
    });
  }

  deleteCategory(id: string) {
    if (!confirm('Delete this category? Transactions may lose their category link.')) return;
    this.apiService.deleteCategory(id).subscribe(() => this.loadCategories());
  }

  addSubCategory(categoryId: string) {
    const name = this.newSubCategoryName().trim();
    if (!name) return;
    this.apiService.createSubCategory(categoryId, name).subscribe(() => {
      this.newSubCategoryName.set('');
      this.selectedCategoryForSub.set(null);
      this.loadCategories();
    });
  }

  deleteSubCategory(id: string) {
    if (!confirm('Delete subcategory?')) return;
    this.apiService.deleteSubCategory(id).subscribe(() => this.loadCategories());
  }

  startEditCategory(cat: Category) {
    this.editingCategoryId.set(cat.id);
    this.editingCategoryName.set(cat.name);
    this.editingCategoryType.set(cat.type);
  }

  cancelEditCategory() {
    this.editingCategoryId.set(null);
  }

  saveEditCategory() {
    const id = this.editingCategoryId();
    const name = this.editingCategoryName().trim();
    if (!id || !name) return;

    this.apiService.updateCategory(id, name, this.editingCategoryType()).subscribe(() => {
      this.editingCategoryId.set(null);
      this.loadCategories();
    });
  }

  startEditSubCategory(sub: { id: string; name: string }) {
    this.editingSubCategoryId.set(sub.id);
    this.editingSubCategoryName.set(sub.name);
  }

  cancelEditSubCategory() {
    this.editingSubCategoryId.set(null);
  }

  saveEditSubCategory() {
    const id = this.editingSubCategoryId();
    const name = this.editingSubCategoryName().trim();
    if (!id || !name) return;

    this.apiService.updateSubCategory(id, name).subscribe(() => {
      this.editingSubCategoryId.set(null);
      this.loadCategories();
    });
  }
}