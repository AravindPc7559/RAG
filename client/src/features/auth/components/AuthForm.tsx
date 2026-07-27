import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  clearAuthError,
} from "@/features/auth/store/authSlice";
import {
  selectAuthError,
  selectAuthIsLoading,
} from "@/features/auth/store/authSelectors";
import {
  loginUser,
  registerUser,
} from "@/features/auth/store/authThunks";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthIsLoading);
  const apiError = useAppSelector(selectAuthError);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isRegister = mode === "register";

  const resetErrors = () => {
    setValidationError(null);
    if (apiError) {
      dispatch(clearAuthError());
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetErrors();

    if (isRegister && name.trim().length < 2) {
      setValidationError("Name must contain at least two characters.");
      return;
    }

    if (!email.trim() || !password) {
      setValidationError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must contain at least eight characters.");
      return;
    }

    if (isRegister) {
      void dispatch(
        registerUser({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      );
      return;
    }

    void dispatch(loginUser({ email: email.trim(), password }));
  };

  const error = validationError ?? apiError?.message;

  return (
    <form className="auth-card" onSubmit={handleSubmit} noValidate>
      <div className="auth-card__heading">
        <span className="eyebrow">RAG workspace</span>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p>
          {isRegister
            ? "Start with a secure workspace account."
            : "Sign in to continue to your workspace."}
        </p>
      </div>

      {isRegister ? (
        <label className="field" htmlFor="name">
          <span>Name</span>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              resetErrors();
            }}
            disabled={isLoading}
          />
        </label>
      ) : null}

      <label className="field" htmlFor="email">
        <span>Email address</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            resetErrors();
          }}
          disabled={isLoading}
        />
      </label>

      <label className="field" htmlFor="password">
        <span>Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            resetErrors();
          }}
          disabled={isLoading}
        />
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="button button--primary button--wide" disabled={isLoading}>
        {isLoading
          ? "Please wait…"
          : isRegister
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="auth-card__switch">
        {isRegister ? "Already have an account?" : "New to the workspace?"}{" "}
        <Link to={isRegister ? paths.login : paths.register}>
          {isRegister ? "Sign in" : "Create account"}
        </Link>
      </p>
    </form>
  );
}
