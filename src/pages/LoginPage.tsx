import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-surface-border rounded-xl p-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-app-text">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-app-bg border border-surface-border rounded-lg px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="bg-app-bg border border-surface-border rounded-lg px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-app-bg rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="text-sm text-app-muted hover:text-app-text"
        >
          {mode === 'signin' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
