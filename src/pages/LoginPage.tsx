import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NockMark } from '../components/common/NockMark';
import { NockWordmark } from '../components/common/NockWordmark';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    if (mode === 'signin') {
      const result = await signIn(email, password);
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      navigate('/', { replace: true });
      return;
    }
    const result = await signUp(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setInfo('Cadastro criado! Confira seu e-mail e clique no link de confirmação antes de entrar.');
      setMode('signin');
      return;
    }
    navigate('/', { replace: true });
  }

  const today = new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-center gap-2.5 mb-1">
          <NockMark size={34} />
          <NockWordmark size={22} />
        </div>
        <div className="w-11 h-11 border border-surface-border rounded bg-surface flex flex-col items-center justify-center mb-1">
          <span className="font-display text-primary text-lg leading-none font-semibold">{today.getDate()}</span>
          <span className="font-mono text-app-muted-2 text-[0.5rem] tracking-widest">
            {today.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-app-text">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="text-sm text-app-muted -mt-2">Suas notas, tarefas e hábitos, num só lugar.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-surface border border-surface-border rounded px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="bg-surface border border-surface-border rounded px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-app-bg rounded py-2 font-semibold disabled:opacity-50"
        >
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
          className="text-sm text-app-muted hover:text-app-text"
        >
          {mode === 'signin' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
