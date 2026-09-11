import { useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Category, CategoryLimit, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateCategorySpending } from './financeApi';
import { formatCurrency, parseCurrencyInput, formatAmountForInput } from '../../lib/currency';

interface MonthlyLimitsProps {
  categoryLimits: CategoryLimit[];
  categories: Category[];
  transactions: Transaction[];
  onCreate: (categoryId: string, monthlyLimit: number) => void;
  onUpdate: (id: string, monthlyLimit: number) => void;
  onDelete: (id: string) => void;
}

// Mesma escala de cor das barras de orçamento do Dashboard (BudgetSnapshot).
function barTone(percent: number): 'hot' | 'warn' | 'ok' {
  if (percent >= 85) return 'hot';
  if (percent >= 60) return 'warn';
  return 'ok';
}

export function MonthlyLimits({ categoryLimits, categories, transactions, onCreate, onUpdate, onDelete }: MonthlyLimitsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newError, setNewError] = useState('');

  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const limitedCategoryIds = new Set(categoryLimits.map((l) => l.category_id));
  const availableCategories = expenseCategories.filter((c) => !limitedCategoryIds.has(c.id));

  function categoryName(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.name ?? 'Categoria removida';
  }

  function startEditing(limit: CategoryLimit) {
    setEditingId(limit.id);
    setEditValue(formatAmountForInput(limit.monthly_limit));
    setEditError('');
  }

  function handleSaveEdit(id: string) {
    const parsed = parseCurrencyInput(editValue);
    if (parsed === null || parsed <= 0) {
      setEditError('Valor inválido');
      return;
    }
    setEditError('');
    onUpdate(id, parsed);
    setEditingId(null);
  }

  function handleCreate() {
    if (!newCategoryId) return;
    const parsed = parseCurrencyInput(newLimit);
    if (parsed === null || parsed <= 0) {
      setNewError('Valor inválido');
      return;
    }
    setNewError('');
    onCreate(newCategoryId, parsed);
    setNewCategoryId('');
    setNewLimit('');
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-base font-semibold mb-3">Limites mensais</h2>

      {categoryLimits.length === 0 && <p className="text-sm text-app-muted mb-3">Nenhum limite definido ainda</p>}

      <div className={categoryLimits.length > 2 ? 'max-h-[210px] overflow-y-auto overflow-x-hidden scrollbar-thin pr-1' : ''}>
        {categoryLimits.map((limit) => {
          const spent = calculateCategorySpending(limit.category_id, transactions, monthStart, monthEnd);
          const percent = Math.min((spent / Number(limit.monthly_limit)) * 100, 100);
          return (
            <div key={limit.id} className="limit">
              <div className="lt">
                <span className="truncate">{categoryName(limit.category_id)}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="v text-app-muted-2">
                    {formatCurrency(spent)} / {formatCurrency(Number(limit.monthly_limit))}
                  </span>
                  <button onClick={() => startEditing(limit)} className="text-xs text-app-muted-2 hover:text-app-text">
                    editar
                  </button>
                  <button onClick={() => onDelete(limit.id)} className="text-app-muted hover:text-danger text-xs">
                    ✕
                  </button>
                </span>
              </div>

              {editingId === limit.id && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(limit.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="input flex-1"
                    />
                    <button onClick={() => handleSaveEdit(limit.id)} className="mini-btn accent">
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditError('');
                        setEditingId(null);
                      }}
                      className="mini-btn"
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && <p className="text-xs text-danger">{editError}</p>}
                </div>
              )}

              <div className="track">
                <i className={`bar-fill ${barTone(percent)}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {availableCategories.length > 0 && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-dashed border-surface-border">
          <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} className="input">
            <option value="">Escolha uma categoria</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Limite mensal"
              className="input flex-1 min-w-0"
            />
            <button onClick={handleCreate} className="btn primary shrink-0">
              Definir limite
            </button>
          </div>
          {newError && <p className="text-xs text-danger">{newError}</p>}
        </div>
      )}
    </div>
  );
}
