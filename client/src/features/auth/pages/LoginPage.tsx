import { AuthForm } from "@/features/auth/components/AuthForm";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="brand-mark">R</span>
        <p className="eyebrow">Scalable by design</p>
        <h2>One clear home for every feature.</h2>
        <p>
          Feature-owned state, predictable async workflows, and a shared API
          foundation that can grow with your team.
        </p>
      </section>
      <AuthForm mode="login" />
    </main>
  );
}
