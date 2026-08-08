import { useState } from 'react';
import { parseCurrencyInput } from '../../lib/currency';

interface CreateAccountModalProps {
  onCreate: (input: { name: string; initialBalance: number }) => void;
  creating: boolean;
}

export function CreateAccountModal({ onCreate, creating }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
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

    const parsed = initialBalance.trim() === '' ? 0 : parseCurrencyInput(initialBalance);
    if (parsed === null) {
      setBalanceError('Valor inválido');
      return;
    }
    setBalanceError('');

    onCreate({ name: trimmedName, initialBalance: parsed });
  }

  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
      <div className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4">
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

        <input
          inputMode="decimal"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="Saldo inicial (opcional)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {balanceError && <p className="text-xs text-danger">{balanceError}</p>}

        <div className="flex justify-end mt-1">
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
