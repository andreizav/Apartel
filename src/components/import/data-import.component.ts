import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ParsedRecord {
  // Generic structure for preview
  [key: string]: any;
  status: 'valid' | 'error';
  message?: string;
}

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-display font-bold text-white">Data Import</h1>
        <p class="text-slate-400">Bulk upload legacy data from Excel/CSV files.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        <!-- Left Panel: Upload Configuration -->
        <div class="lg:col-span-1 space-y-6">
          
          <!-- 1. Select Type -->
          <div class="bg-dark-800 p-6 rounded-xl border border-dark-700">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-xs text-white">1</span>
              Select Import Type
            </h3>
            <div class="space-y-3">
              <label class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 cursor-pointer hover:bg-dark-700 transition-colors"
                [class.bg-brand-900_20]="importType() === 'hierarchy'"
                [class.border-brand-500]="importType() === 'hierarchy'">
                <input type="radio" name="type" value="hierarchy" [(ngModel)]="importType" class="text-brand-600 focus:ring-brand-500">
                <div>
                  <div class="font-medium text-white">Property Structure</div>
                  <div class="text-xs text-slate-400">Groups, Units, and Hierarchy mapping</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 cursor-pointer hover:bg-dark-700 transition-colors"
                [class.bg-brand-900_20]="importType() === 'finance'"
                [class.border-brand-500]="importType() === 'finance'">
                <input type="radio" name="type" value="finance" [(ngModel)]="importType" class="text-brand-600 focus:ring-brand-500">
                <div>
                  <div class="font-medium text-white">Financial P&L</div>
                  <div class="text-xs text-slate-400">Expense matrix (Categories x Dates)</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 rounded-lg border border-dark-700 cursor-pointer hover:bg-dark-700 transition-colors"
                [class.bg-brand-900_20]="importType() === 'cleaning'"
                [class.border-brand-500]="importType() === 'cleaning'">
                <input type="radio" name="type" value="cleaning" [(ngModel)]="importType" class="text-brand-600 focus:ring-brand-500">
                <div>
                  <div class="font-medium text-white">Cleaning / Staff Report</div>
                  <div class="text-xs text-slate-400">Staff & Unit Matrix (Pivot export)</div>
                </div>
              </label>
            </div>
          </div>

          <!-- 2. Upload Area -->
          <div class="bg-dark-800 p-6 rounded-xl border border-dark-700">
             <h3 class="text-white font-bold mb-4 flex items-center gap-2">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-xs text-white">2</span>
              Upload File
            </h3>
            
            <div class="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-brand-500 hover:bg-dark-700/30 transition-all cursor-pointer relative">
              <input type="file" (change)="onFileSelected($event)" class="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.csv,.txt" />
              <div class="pointer-events-none">
                <span class="material-symbols-rounded text-4xl text-slate-500 mb-2">cloud_upload</span>
                <p class="text-sm font-medium text-slate-300">Click to upload or drag & drop</p>
                <p class="text-xs text-slate-500 mt-1">Supports .xlsx, .csv, .txt</p>
              </div>
            </div>

            @if (selectedFile()) {
              <div class="mt-4 bg-dark-900 p-3 rounded-lg flex items-center justify-between border border-dark-700">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-rounded text-green-500">description</span>
                  <div class="overflow-hidden">
                    <p class="text-sm text-white truncate max-w-[150px]">{{ selectedFile()?.name }}</p>
                    <p class="text-xs text-slate-500">{{ (selectedFile()?.size || 0) / 1024 | number:'1.0-2' }} KB</p>
                  </div>
                </div>
                <button (click)="clearFile()" class="text-slate-400 hover:text-red-400"><span class="material-symbols-rounded">delete</span></button>
              </div>
              
              <button (click)="processFile()" class="w-full mt-4 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2">
                @if (isUploading()) {
                   <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processing...
                } @else {
                   <span class="material-symbols-rounded">settings_backup_restore</span> Parse File
                }
              </button>
            }
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="lg:col-span-2 bg-dark-800 rounded-xl border border-dark-700 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-dark-700 bg-dark-900/50 flex justify-between items-center">
            <h3 class="font-bold text-white flex items-center gap-2">
              <span class="material-symbols-rounded text-brand-500">table_view</span> Data Preview
            </h3>
            @if (previewData().length > 0) {
               <div class="flex items-center gap-4">
                  <div class="text-xs font-mono text-slate-400">
                    {{ previewData().length }} records found
                  </div>
                  <button class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2">
                    <span class="material-symbols-rounded text-sm">save</span> Import to DB
                  </button>
               </div>
            }
          </div>

          <div class="flex-1 overflow-auto bg-dark-900 relative">
            @if (previewData().length === 0) {
              <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <span class="material-symbols-rounded text-6xl mb-4 opacity-50">data_array</span>
                <p>Upload a file to preview data structure</p>
              </div>
            } @else {
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-dark-800 text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr>
                    @if (importType() === 'finance' || importType() === 'cleaning') {
                        <th class="px-4 py-3 font-semibold">Date</th>
                        <th class="px-4 py-3 font-semibold">Row Label (Staff/Unit)</th>
                        <th class="px-4 py-3 font-semibold text-right">Amount</th>
                        <th class="px-4 py-3 font-semibold">Status</th>
                    } @else {
                        <th class="px-4 py-3 font-semibold">Group Context</th>
                        <th class="px-4 py-3 font-semibold">Unit Name</th>
                        <th class="px-4 py-3 font-semibold">Type</th>
                        <th class="px-4 py-3 font-semibold">Status</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-700">
                  @for (row of previewData(); track $index) {
                    <tr class="hover:bg-dark-800/50 transition-colors">
                      @if (importType() === 'finance' || importType() === 'cleaning') {
                        <td class="px-4 py-2 text-slate-300">{{ row['date'] }}</td>
                        <td class="px-4 py-2 text-white font-medium">{{ row['category'] }}</td>
                        <td class="px-4 py-2 text-right font-mono" [class.text-red-400]="row['isError']">
                            {{ row['amount'] | currency }}
                        </td>
                        <td class="px-4 py-2">
                           @if (row['isError']) {
                             <span class="inline-flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                               Error
                             </span>
                           } @else {
                             <span class="text-slate-500 text-xs">Valid</span>
                           }
                        </td>
                      } @else {
                        <td class="px-4 py-2 text-slate-300">{{ row['group'] || '-' }}</td>
                        <td class="px-4 py-2 text-white font-medium">{{ row['unit'] }}</td>
                        <td class="px-4 py-2 text-slate-400">
                            @if(row['type'] === 'Warehouse') {
                                <span class="text-amber-500">Warehouse</span>
                            } @else {
                                Rental
                            }
                        </td>
                        <td class="px-4 py-2"><span class="text-emerald-500 text-xs">Ready</span></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DataImportComponent {
  importType = signal<'hierarchy' | 'finance' | 'cleaning'>('finance');
  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  previewData = signal<ParsedRecord[]>([]);
  
  // Store raw CSV content for client-side parsing
  csvContent = signal<string | null>(null);

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.previewData.set([]);
      this.csvContent.set(null);
      
      // If it's a CSV/TXT, read it immediately for preview
      if (file.type === "text/csv" || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
         const reader = new FileReader();
         reader.onload = (e) => {
            this.csvContent.set(e.target?.result as string);
         };
         reader.readAsText(file);
      }
    }
  }

  clearFile() {
    this.selectedFile.set(null);
    this.previewData.set([]);
    this.csvContent.set(null);
  }

  processFile() {
    this.isUploading.set(true);
    
    // Simulate network delay
    setTimeout(() => {
      this.isUploading.set(false);
      
      if (this.csvContent()) {
          // Parse Real CSV
          this.parseCSV(this.csvContent()!);
      } else {
          // Fallback to Mock Data (Simulating server parsing for .xlsx)
          this.loadMockData();
      }
    }, 1000);
  }

  parseCSV(text: string) {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return;

      const results: ParsedRecord[] = [];
      // Detect delimiter (tab or comma)
      const delimiter = lines[0].indexOf('\t') !== -1 ? '\t' : ',';
      
      // Assume Row 1 (or 0) is Header with Dates
      // Handling "Pivot Table" extra headers: skip if first cell contains "Sum"
      let headerIndex = 0;
      if (lines[0].toLowerCase().includes('sum') || lines[0].toLowerCase().includes('amount')) {
          headerIndex = 1; // Skip the metadata row
      }
      
      if (headerIndex >= lines.length) return;
      
      const headers = lines[headerIndex].split(delimiter).map(h => h.trim());

      // Iterate Rows
      for (let i = headerIndex + 1; i < lines.length; i++) {
          const row = lines[i].split(delimiter);
          if (row.length < 2) continue;

          const rowLabel = row[0].trim();
          if (!rowLabel || rowLabel.toLowerCase() === 'total' || rowLabel.toLowerCase() === 'grand total') continue;

          // Matrix Unpivoting
          if (this.importType() === 'finance' || this.importType() === 'cleaning') {
             for (let j = 1; j < row.length; j++) {
                 const dateCol = headers[j];
                 const valStr = row[j] ? row[j].trim() : '';
                 
                 // If value exists, add record
                 if (dateCol && valStr && valStr !== '') {
                     // Clean value: remove currency, handle #VALUE!
                     let amount = 0;
                     let isError = false;
                     if (valStr.includes('#VALUE') || valStr.includes('Error')) {
                         isError = true;
                     } else {
                         amount = parseFloat(valStr.replace(/[^0-9.-]+/g, ""));
                         if (isNaN(amount)) amount = 0;
                     }

                     if (amount !== 0 || isError) {
                         results.push({
                             date: dateCol,
                             category: rowLabel,
                             amount: amount,
                             isError: isError,
                             status: isError ? 'error' : 'valid'
                         });
                     }
                 }
             }
          }
      }
      // Limit preview to 100
      this.previewData.set(results.slice(0, 100));
  }

  loadMockData() {
      if (this.importType() === 'finance' || this.importType() === 'cleaning') {
        this.previewData.set([
          { date: '1/1/2019', category: 'Anya', amount: 200, status: 'valid' },
          { date: '1/1/2019', category: 'Art 1', amount: 200, status: 'valid' },
          { date: '1/2/2019', category: 'Zhenya', amount: 600, status: 'valid' },
          { date: '1/2/2019', category: 'Dragon', amount: 150, status: 'valid' },
          { date: '1/2/2019', category: 'Cars', amount: 0, status: 'error', isError: true },
        ]);
      } else {
        this.previewData.set([
          { group: 'Art Apartments', unit: 'Art 1', type: 'Rental', status: 'valid' },
          { group: 'Art Apartments', unit: 'Art 2', type: 'Rental', status: 'valid' },
          { group: null, unit: 'ОФИС', type: 'Warehouse', status: 'valid' },
        ]);
      }
  }
}
