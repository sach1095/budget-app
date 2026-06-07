import { Injectable, inject } from '@angular/core';
import { BudgetService } from './budget.service';
import { Transaction } from '../models';

export interface ColMapping {
  dateCol: number;
  labelCol: number;
  amountCol: number;
  sep: string;
}

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  private budget = inject(BudgetService);

  async parseFile(file: File, accountId: string): Promise<Omit<Transaction, 'id'>[]> {
    const raw = await this.readFile(file);
    const sep = this.detectSep(raw);
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) return [];

    // LCL: first line starts with DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(lines[0])) {
      return this.parseLCL(lines, sep, accountId);
    }
    const header = lines[0].toLowerCase();
    if (header.includes('libellé') || header.includes('libelle')) {
      return this.parseBNP(lines, sep, accountId);
    }
    if (header.includes('date opération') || header.includes('date operation')) {
      return this.parseCA(lines, sep, accountId);
    }
    return this.parseGeneric(lines, sep, accountId);
  }

  /** Get raw rows for column-picker fallback */
  async getRawRows(file: File): Promise<{ rows: string[][]; sep: string }> {
    const raw = await this.readFile(file);
    const sep = this.detectSep(raw);
    const rows = raw.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => this.splitCSV(l, sep));
    return { rows, sep };
  }

  /** Parse using manually-specified column mapping */
  parseManual(
    rows: string[][],
    mapping: ColMapping,
    accountId: string
  ): Omit<Transaction, 'id'>[] {
    const result: Omit<Transaction, 'id'>[] = [];
    for (const cols of rows) {
      const date = this.normalizeDate(cols[mapping.dateCol] ?? '');
      if (!date) continue;
      const amtRaw = (cols[mapping.amountCol] ?? '').replace(',', '.').replace(/\s/g, '');
      const amount = parseFloat(amtRaw);
      if (isNaN(amount) || amount === 0) continue;
      const label = (cols[mapping.labelCol] ?? '').replace(/^CB\s+/i, '').replace(/\s{2,}/g, ' ').trim();
      if (!label) continue;
      const contribFrom = (accountId === 'commun' && amount > 0 && this.budget.isSanteKeyword(label))
        ? '__remboursement_sante__' : undefined;
      result.push({
        date, label, amount,
        category: this.budget.autoCategorize(label),
        accountId,
        month: date.substring(0, 7),
        contribFrom,
      });
    }
    return result;
  }

  // LCL format: date;montant;type;;libellé;;...  (no header)
  private parseLCL(lines: string[], sep: string, accountId: string): Omit<Transaction, 'id'>[] {
    const result: Omit<Transaction, 'id'>[] = [];
    for (const line of lines) {
      const cols = this.splitCSV(line, sep);
      const date = this.normalizeDate(cols[0]);
      if (!date) continue;
      const amount = parseFloat((cols[1] || '0').replace(',', '.').replace(/\s/g, ''));
      if (isNaN(amount) || amount === 0) continue;
      // Label at col4 (preferred) or col2
      const label = (cols[4] || cols[2] || '').replace(/^CB\s+/i, '').replace(/\s{2,}/g, ' ').trim();
      if (!label) continue;
      const contribFrom = (accountId === 'commun' && amount > 0 && this.budget.isSanteKeyword(label))
        ? '__remboursement_sante__' : undefined;
      result.push({
        date, label, amount,
        category: this.budget.autoCategorize(label),
        accountId,
        month: date.substring(0, 7),
        contribFrom,
      });
    }
    return result;
  }

  private parseBNP(lines: string[], sep: string, accountId: string): Omit<Transaction, 'id'>[] {
    const result: Omit<Transaction, 'id'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCSV(lines[i], sep);
      if (cols.length < 4) continue;
      const date = this.normalizeDate(cols[0]);
      const label = cols[1]?.replace(/^"+|"+$/g, '').trim();
      const amount = parseFloat((cols[3] || cols[2] || '0').replace(',', '.').replace(/\s/g, ''));
      if (!date || !label || isNaN(amount)) continue;
      const contribFrom = (accountId === 'commun' && amount > 0 && this.budget.isSanteKeyword(label))
        ? '__remboursement_sante__' : undefined;
      result.push({ date, label, amount, category: this.budget.autoCategorize(label), accountId, month: date.substring(0, 7), contribFrom });
    }
    return result;
  }

  private parseCA(lines: string[], sep: string, accountId: string): Omit<Transaction, 'id'>[] {
    const result: Omit<Transaction, 'id'>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCSV(lines[i], sep);
      if (cols.length < 3) continue;
      const date = this.normalizeDate(cols[0]);
      const label = cols[1]?.replace(/^"+|"+$/g, '').trim();
      const amount = parseFloat((cols[2] || '0').replace(',', '.').replace(/\s/g, ''));
      if (!date || !label || isNaN(amount)) continue;
      const contribFrom = (accountId === 'commun' && amount > 0 && this.budget.isSanteKeyword(label))
        ? '__remboursement_sante__' : undefined;
      result.push({ date, label, amount, category: this.budget.autoCategorize(label), accountId, month: date.substring(0, 7), contribFrom });
    }
    return result;
  }

  private parseGeneric(lines: string[], sep: string, accountId: string): Omit<Transaction, 'id'>[] {
    const result: Omit<Transaction, 'id'>[] = [];
    const header = lines[0].split(sep).map(h => h.toLowerCase().trim());
    const dateIdx = header.findIndex(h => h.includes('date'));
    const labelIdx = header.findIndex(h => h.includes('libel') || h.includes('descr') || h.includes('label'));
    const amtIdx = header.findIndex(h => h.includes('montant') || h.includes('amount') || h.includes('débit') || h.includes('credit'));
    if (dateIdx < 0 || labelIdx < 0 || amtIdx < 0) return [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCSV(lines[i], sep);
      const date = this.normalizeDate(cols[dateIdx]);
      const label = cols[labelIdx]?.replace(/^"+|"+$/g, '').trim();
      const amount = parseFloat((cols[amtIdx] || '0').replace(',', '.').replace(/\s/g, ''));
      if (!date || !label || isNaN(amount)) continue;
      const contribFrom = (accountId === 'commun' && amount > 0 && this.budget.isSanteKeyword(label))
        ? '__remboursement_sante__' : undefined;
      result.push({ date, label, amount, category: this.budget.autoCategorize(label), accountId, month: date.substring(0, 7), contribFrom });
    }
    return result;
  }

  private detectSep(raw: string): string {
    const first = raw.split('\n')[0];
    return first.includes(';') ? ';' : ',';
  }

  private splitCSV(line: string, sep: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === sep && !inQ) { result.push(cur); cur = ''; }
      else cur += ch;
    }
    result.push(cur);
    return result;
  }

  private normalizeDate(raw: string): string {
    if (!raw) return '';
    raw = raw.trim().replace(/^"+|"+$/g, '');
    const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (fr) {
      let y = fr[3]; if (y.length === 2) y = '20' + y;
      return `${y}-${fr[2]}-${fr[1]}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
    return '';
  }

  private readFile(file: File): Promise<string> {
    return new Promise((res, rej) => {
      // Try UTF-8 first (handles BOM natively)
      const reader = new FileReader();
      reader.onload = e => {
        let text = e.target?.result as string;
        // Strip BOM if present (UTF-8 BOM read as UTF-8 = ﻿)
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        // If first line looks garbled (non-printable chars outside ASCII before date),
        // it may be ISO-8859-1 content misread as UTF-8 — but for now UTF-8 covers LCL
        res(text);
      };
      reader.onerror = () => {
        // Fallback: ISO-8859-1 (French bank legacy encoding)
        const r2 = new FileReader();
        r2.onload = e2 => res(e2.target?.result as string);
        r2.onerror = rej;
        r2.readAsText(file, 'ISO-8859-1');
      };
      reader.readAsText(file, 'UTF-8');
    });
  }
}
