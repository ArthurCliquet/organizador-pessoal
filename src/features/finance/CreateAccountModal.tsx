import { useState } from 'react';
import { parseCurrencyInput } from '../../lib/currency';
import { Modal } from '../../components/common/Modal';

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

  const body = (
    <div className="flex flex-col gap-3">
      {!onCancel && <p className="text-sm text-app-muted">Como se chama a conta ou carteira onde você guarda seu dinheiro?</p>}

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da conta (ex: Nubank)"
        className="input"
      />
      {nameError && <p className="text-xs text-danger">{nameError}</p>}

      <label className="flex items-center gap-2 text-sm text-app-muted">
        <input type="checkbox" checked={isInvestment} onChange={(e) => setIsInvestment(e.target.checked)} className="accent-primary" />
        É uma conta de investimento
      </label>

      {!isInvestment && (
        <>
          <input
            inputMode="decimal"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="Saldo inicial (opcional)"
            className="input"
          />
          {balanceError && <p className="text-xs text-danger">{balanceError}</p>}
        </>
      )}
    </div>
  );

  const footer = (
    <>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mini-btn">
          Cancelar
        </button>
      )}
      <button type="button" onClick={handleSubmit} disabled={creating} className="mini-btn accent disabled:opacity-50">
        {creating ? 'Criando...' : 'Criar conta'}
      </button>
    </>
  );

  if (!onCancel) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <div className="bg-surface border border-surface-border rounded-card shadow-pop p-6 max-w-sm w-full flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Nomeie sua conta</h3>
          {body}
          <div className="flex justify-end gap-2">{footer}</div>
        </div>
      </div>
    );
  }

  return (
    <Modal onClose={onCancel} title="Nomeie sua conta" size="sm" footer={footer}>
      {body}
    </Modal>
  );
}
