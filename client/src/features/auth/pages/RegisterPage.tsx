import { AuthForm } from "@/features/auth/components/AuthForm";

export function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="brand-mark">R</span>
        <p className="eyebrow">Build with confidence</p>
        <h2>A frontend foundation your team can extend.</h2>
        <p>
          Each business capability owns its UI, API calls, Redux state, async
          thunks, selectors, and types.
        </p>
      </section>
      <AuthForm mode="register" />
    </main>
  );
}
