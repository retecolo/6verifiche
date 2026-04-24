import LoginForm from '@/components/LoginForm';

export const metadata = { title: 'Sign In — IPv6 Compliance Tracker' };

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-card card">
        <h1 className="login-title">IPv6 Compliance Tracker</h1>
        <p className="login-subtitle">Sign in to continue</p>
        <LoginForm />
      </div>
    </main>
  );
}
