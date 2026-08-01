import { AuthForm } from "@/features/auth/components/AuthForm";

export function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-page__intro">
        <span className="brand-mark">S</span>
        <p className="eyebrow">SourceSense</p>
        <h2>Create your SourceSense workspace.</h2>
        <p>
          Upload documents, connect GitHub, and turn your sources into answers
          your team can trust.
        </p>
      </section>
      <AuthForm mode="register" />
    </main>
  );
}
