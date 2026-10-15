import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface AuthProps {
  onLoginSuccess: (user: any) => void;
  onNavigateToCatalog: () => void;
}

type Tab = 'login' | 'register';

const WINERY_IMAGE = 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=900&q=80';

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onNavigateToCatalog }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Cadastro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');

  const switchTab = (t: Tab) => { setTab(t); setError(null); };

  /* ── HANDLERS ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/identity/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas.');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!regBirthDate) {
        throw new Error('A data de nascimento é obrigatória.');
      }

      const birthDate = new Date(regBirthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (isNaN(birthDate.getTime()) || age < 21) {
        throw new Error('Você deve ter 21 anos ou mais para se cadastrar.');
      }

      const res = await fetch('/api/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, birthDate: regBirthDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details ? data.details.join(', ') : (data.error || 'Erro ao cadastrar.'));
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen animate-fade">

      {/* Painel visual (Desktop) */}
      <div className="auth-visual" aria-hidden="true">
        <img
          src={WINERY_IMAGE}
          alt="Interior de uma adega com barris de carvalho"
          className="auth-visual-img"
        />
        <div className="auth-visual-overlay">
          <blockquote className="auth-visual-quote">
            "O vinho é a arte que torna o ordinário em extraordinário."
          </blockquote>
          <p className="auth-visual-author">— Origem Vinhos</p>
        </div>
      </div>

      {/* Painel do Formulário */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">

          <p className="auth-brand">Origem Vinhos</p>
          <h1 className="auth-welcome">
            {tab === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="auth-sub">
            {tab === 'login'
              ? 'Acesse sua conta para explorar a adega.'
              : 'Junte-se à nossa comunidade de apreciadores.'}
          </p>

          {/* Abas */}
          <div className="auth-tabs" role="tablist">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
              role="tab"
              aria-selected={tab === 'login'}
            >
              Entrar
            </button>
            <button
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
              role="tab"
              aria-selected={tab === 'register'}
            >
              Cadastrar
            </button>
          </div>

          {/* Erro */}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <Input
                label="E-mail"
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Senha"
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                style={{ marginTop: 'var(--space-6)' }}
                isLoading={loading}
              >
                Acessar Adega
              </Button>
            </form>
          )}

          {/* ── CADASTRO ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <Input
                label="Nome Completo"
                id="reg-name"
                type="text"
                placeholder="Seu nome"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
                autoComplete="name"
              />
              <Input
                label="E-mail"
                id="reg-email"
                type="email"
                placeholder="seu@email.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Senha"
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <Input
                label="Data de Nascimento (21+)"
                id="reg-birth"
                type="date"
                value={regBirthDate}
                onChange={e => setRegBirthDate(e.target.value)}
                required
                helperText="Obrigatório ter 21 anos ou mais para se cadastrar."
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                style={{ marginTop: 'var(--space-6)' }}
                isLoading={loading}
              >
                Criar Conta
              </Button>
            </form>
          )}

          {/* Voltar ao catálogo */}
          <div className="auth-footer-link">
            <button onClick={onNavigateToCatalog}>
              ← Continuar sem login
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
