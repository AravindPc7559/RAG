import { AuthForm } from "@/features/auth/components/AuthForm";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="brand-mark">S</span>
        <p className="eyebrow">SourceSense</p>
        <h2>Ask your docs and code with confidence.</h2>
        <p>
          Connect documents and GitHub repositories, build knowledge bases, and
          get answers grounded in your source.
        </p>
      </section>
      <AuthForm mode="login" />
    </main>
  );
}
