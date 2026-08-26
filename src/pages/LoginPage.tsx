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
    <div className="login-page">
      <div className="login-glow" />
      <div className="login-cover-slot">
        <div className="login-cover-sliver login-cover-sliver-1" style={{ animationDelay: '0.05s' }} />
        <div className="login-cover-sliver login-cover-sliver-2" style={{ animationDelay: '0.12s' }} />

        <button
          type="button"
          className="login-tab"
          onClick={toggleMode}
          aria-label={isSignup ? 'Alternar para entrar' : 'Alternar para criar conta'}
        >
          {isSignup ? 'Entrar' : 'Criar conta'}
          <span className="login-tab-arrow">›</span>
        </button>

        <form onSubmit={handleSubmit} className="login-cover" style={{ animationDelay: '0.18s' }}>
          <div className="login-logo-row">
            <NockMark size={30} />
            <NockWordmark size={19} />
          </div>
          <div className="login-tear" />

          <h1 className="font-display text-2xl font-semibold text-app-text">
            {isSignup ? 'Criar conta' : 'Entrar'}
          </h1>
          <p className="text-sm text-app-muted -mt-2">Suas notas, tarefas e hábitos, num só lugar.</p>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="login-input"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="login-input"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}
          <button type="submit" disabled={submitting} className="login-submit">
            {isSignup ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
