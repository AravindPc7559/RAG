import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { chatAPI } from "@/features/chat/api/chatApi";
import { toApiErrorPayload } from "@/services/apiErrors";

interface ChatLocationState {
  documentName?: string;
}

interface ChatExchange {
  id: number;
  question: string;
  answer: string | null;
  status: "loading" | "succeeded" | "failed";
}

export default function DocumentChat() {
  const location = useLocation();
  const { documentId } = useParams<{ documentId: string }>();
  const chatState = location.state as ChatLocationState | null;
  const documentName = chatState?.documentName ?? "Uploaded document";
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedQuestion = question.trim();
    if (!submittedQuestion || !documentId || isAnswering) {
      return;
    }

    const exchangeId = Date.now();
    setQuestion("");
    setIsAnswering(true);
    setExchanges((current) => [
      ...current,
      {
        id: exchangeId,
        question: submittedQuestion,
        answer: null,
        status: "loading",
      },
    ]);

    try {
      const response = await chatAPI.askDocument(
        submittedQuestion,
        documentId,
      );
      const answer =
        response.answer?.trim() ||
        "I could not find enough relevant information in this document.";

      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === exchangeId
            ? { ...exchange, answer, status: "succeeded" }
            : exchange,
        ),
      );
    } catch (error) {
      const message = toApiErrorPayload(error).message;
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === exchangeId
            ? { ...exchange, answer: message, status: "failed" }
            : exchange,
        ),
      );
    } finally {
      setIsAnswering(false);
    }
  };

  const handleQuestionKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <main className="chat-page">
      <header className="chat-header">
        <div className="chat-header__brand">
          <span className="brand-mark brand-mark--small">R</span>
          <div>
            <span className="eyebrow">Document conversation</span>
            <strong>Ask your document</strong>
          </div>
        </div>

        <div className="chat-header__actions">
          <span className="chat-document-chip" title={documentName}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
              <path d="M14 3v5h5" />
            </svg>
            <span>{documentName}</span>
          </span>
          <Link className="chat-new-document" to={paths.dashboard}>
            New document
          </Link>
        </div>
      </header>

      <section
        className={`chat-conversation${exchanges.length === 0 ? " chat-conversation--empty" : ""}`}
        aria-live="polite"
      >
        {exchanges.length === 0 ? (
          <div className="chat-welcome">
            <span className="chat-welcome__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3a7 7 0 0 0-4 12.74V21l4-2 4 2v-5.26A7 7 0 0 0 12 3Z" />
                <path d="m9.5 11 1.6 1.6 3.5-3.7" />
              </svg>
            </span>
            <span className="eyebrow">Document ready</span>
            <h1>What would you like to know?</h1>
            <p>
              Ask a question and the answer will appear alongside it, grounded
              in the content of <strong>{documentName}</strong>.
            </p>
          </div>
        ) : (
          <div className="chat-exchanges">
            {exchanges.map((exchange, index) => (
              <article className="chat-exchange" key={exchange.id}>
                <div className="chat-message chat-message--question">
                  <span className="chat-message__label">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    Your question
                  </span>
                  <p>{exchange.question}</p>
                </div>

                <div
                  className={`chat-message chat-message--answer${
                    exchange.status === "failed" ? " chat-message--error" : ""
                  }`}
                >
                  <span className="chat-message__label">
                    <span className="chat-message__ai-mark">R</span>
                    Document answer
                  </span>
                  {exchange.status === "loading" ? (
                    <div className="chat-answer-loading" role="status">
                      <span />
                      <span />
                      <span />
                      <small>Searching your document</small>
                    </div>
                  ) : (
                    <p>{exchange.answer}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="chat-composer-wrap">
        <form className="chat-composer" onSubmit={handleSubmit}>
          <textarea
            value={question}
            rows={1}
            placeholder="Ask something about your document…"
            aria-label="Question about your document"
            disabled={isAnswering}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
          />
          <button
            type="submit"
            aria-label="Send question"
            disabled={!question.trim() || !documentId || isAnswering}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12 14-7-4 14-3-6-7-1Z" />
              <path d="m12 13 7-8" />
            </svg>
          </button>
        </form>
        <p>Press Enter to send · Shift + Enter for a new line</p>
      </footer>
    </main>
  );
}
