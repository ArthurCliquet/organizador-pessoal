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

  function toggleMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setInfo(null);
  }

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-dvh grid place-items-center p-6 bg-app-bg">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-surface-border rounded-[14px] shadow-pop p-7 w-full max-w-[360px] flex flex-col gap-3"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <NockMark size={30} />
          <NockWordmark size={19} />
        </div>

        <h1 className="text-xl font-semibold text-app-text">{isSignup ? 'Criar conta' : 'Entrar'}</h1>
        <p className="text-sm text-app-muted -mt-2">Suas notas, tarefas e hábitos, num só lugar.</p>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-surface-2 border border-surface-border rounded-sm px-3 py-2 text-sm text-app-text outline-none focus:border-primary transition-colors"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="bg-surface-2 border border-surface-border rounded-sm px-3 py-2 text-sm text-app-text outline-none focus:border-primary transition-colors"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary rounded-sm py-2.5 font-semibold hover:bg-primary-bright transition-colors disabled:opacity-60"
        >
          {isSignup ? 'Criar conta' : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="text-xs text-app-muted-2 hover:text-primary-bright transition-colors text-center"
        >
          {isSignup ? 'Já tenho conta — entrar' : 'Não tenho conta — criar'}
        </button>
      </form>
    </div>
  );
}
