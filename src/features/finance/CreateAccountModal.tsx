import { useState } from 'react';
import { parseCurrencyInput } from '../../lib/currency';

interface CreateAccountModalProps {
  onCreate: (input: { name: string; initialBalance: number; isInvestment: boolean }) => void;
  creating: boolean;
  onCancel?: () => void;
}

export function CreateAccountModal({ onCreate, creating, onCancel }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isInvestment, setIsInvestment] = useState(false);
  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  function handleSubmit() {
    if (creating) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Informe um nome para a conta');
      return;
    }
    setNameError('');

    if (isInvestment) {
      setBalanceError('');
      onCreate({ name: trimmedName, initialBalance: 0, isInvestment: true });
      return;
    }

    const parsed = initialBalance.trim() === '' ? 0 : parseCurrencyInput(initialBalance);
    if (parsed === null) {
      setBalanceError('Valor inválido');
      return;
    }
    setBalanceError('');

    onCreate({ name: trimmedName, initialBalance: parsed, isInvestment: false });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Nomeie sua conta</h3>
        <p className="text-sm text-app-muted">Como se chama a conta ou carteira onde você guarda seu dinheiro?</p>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da conta (ex: Nubank)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {nameError && <p className="text-xs text-danger">{nameError}</p>}

        <label className="flex items-center gap-2 text-sm text-app-muted">
          <input
            type="checkbox"
            checked={isInvestment}
            onChange={(e) => setIsInvestment(e.target.checked)}
            className="accent-primary"
          />
          É uma conta de investimento
        </label>

        {!isInvestment && (
          <>
            <input
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="Saldo inicial (opcional)"
              className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
            />
            {balanceError && <p className="text-xs text-danger">{balanceError}</p>}
          </>
        )}

        <div className="flex justify-end gap-2 mt-1">
          {onCancel && (
            <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating}
            className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold disabled:opacity-50"
          >
            {creating ? 'Criando...' : 'Criar conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
