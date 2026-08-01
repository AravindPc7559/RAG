import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { chatAPI, type ChatEntity } from "@/features/chat/api/chatApi";
import { toApiErrorPayload } from "@/services/apiErrors";

const HISTORY_PAGE_SIZE = 10;
const TOP_SCROLL_THRESHOLD_PX = 48;

interface ChatLocationState {
  documentName?: string;
}

interface ChatExchange {
  id: string;
  question: string;
  answer: string | null;
  status: "loading" | "succeeded" | "failed";
  createdAt: string;
}

function toExchange(chat: ChatEntity): ChatExchange {
  return {
    id: chat.id,
    question: chat.question,
    answer: chat.answer,
    status: "succeeded",
    createdAt:
      typeof chat.createdAt === "string"
        ? chat.createdAt
        : new Date(chat.createdAt).toISOString(),
  };
}

export default function DocumentChat() {
  const location = useLocation();
  const { documentId } = useParams<{ documentId: string }>();
  const chatState = location.state as ChatLocationState | null;
  const documentName = chatState?.documentName ?? "Uploaded document";
  const conversationRef = useRef<HTMLElement>(null);
  const exchangesRef = useRef<ChatExchange[]>([]);
  const hasMoreHistoryRef = useRef(false);
  const isLoadingMoreRef = useRef(false);

  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(Boolean(documentId));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    exchangesRef.current = exchanges;
  }, [exchanges]);

  useEffect(() => {
    hasMoreHistoryRef.current = hasMoreHistory;
  }, [hasMoreHistory]);

  const scrollToBottom = useCallback(() => {
    const container = conversationRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

  const loadHistory = useCallback(
    async (mode: "initial" | "older") => {
      if (!documentId || isLoadingMoreRef.current) {
        return;
      }

      let before: string | undefined;
      if (mode === "older") {
        const oldest = exchangesRef.current[0];
        if (!oldest || !hasMoreHistoryRef.current) {
          return;
        }
        before = oldest.createdAt;
      }

      isLoadingMoreRef.current = true;
      if (mode === "initial") {
        setIsHistoryLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setHistoryError(null);

      const container = conversationRef.current;
      const previousHeight = container?.scrollHeight ?? 0;
      const previousTop = container?.scrollTop ?? 0;

      try {
        const response = await chatAPI.getChats(documentId, {
          limit: HISTORY_PAGE_SIZE,
          before,
        });
        const olderExchanges = [...response.chats]
          .reverse()
          .map(toExchange);

        setHasMoreHistory(response.hasMore);
        setExchanges((current) => {
          if (mode === "initial") {
            return olderExchanges;
          }

          const existingIds = new Set(current.map((item) => item.id));
          const uniqueOlder = olderExchanges.filter(
            (item) => !existingIds.has(item.id),
          );
          return [...uniqueOlder, ...current];
        });

        requestAnimationFrame(() => {
          if (mode === "initial") {
            scrollToBottom();
            return;
          }

          if (!container) {
            return;
          }

          const heightDelta = container.scrollHeight - previousHeight;
          container.scrollTop = previousTop + heightDelta;
        });
      } catch (error) {
        setHistoryError(toApiErrorPayload(error).message);
      } finally {
        isLoadingMoreRef.current = false;
        setIsHistoryLoading(false);
        setIsLoadingMore(false);
      }
    },
    [documentId, scrollToBottom],
  );

  useEffect(() => {
    if (!documentId) {
      setIsHistoryLoading(false);
      setExchanges([]);
      setHasMoreHistory(false);
      return;
    }

    setExchanges([]);
    setHasMoreHistory(false);
    void loadHistory("initial");
  }, [documentId, loadHistory]);

  const handleConversationScroll = (event: UIEvent<HTMLElement>) => {
    if (
      event.currentTarget.scrollTop > TOP_SCROLL_THRESHOLD_PX ||
      !hasMoreHistoryRef.current ||
      isLoadingMoreRef.current ||
      isHistoryLoading
    ) {
      return;
    }

    void loadHistory("older");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submittedQuestion = question.trim();
    if (!submittedQuestion || !documentId || isAnswering) {
      return;
    }

    const exchangeId = `local-${Date.now()}`;
    const createdAt = new Date().toISOString();
    setQuestion("");
    setIsAnswering(true);
    setExchanges((current) => [
      ...current,
      {
        id: exchangeId,
        question: submittedQuestion,
        answer: null,
        status: "loading",
        createdAt,
      },
    ]);
    requestAnimationFrame(scrollToBottom);

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
      requestAnimationFrame(scrollToBottom);
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

  const showWelcome =
    !isHistoryLoading && exchanges.length === 0 && !historyError;

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
        ref={conversationRef}
        className={`chat-conversation${showWelcome ? " chat-conversation--empty" : ""}`}
        aria-live="polite"
        onScroll={handleConversationScroll}
      >
        {isHistoryLoading ? (
          <div className="chat-history-status" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading previous chats…
          </div>
        ) : null}

        {!isHistoryLoading && historyError ? (
          <div className="chat-history-status chat-history-status--error" role="alert">
            <strong>Could not load chat history.</strong>
            <span>{historyError}</span>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void loadHistory("initial")}
            >
              Try again
            </button>
          </div>
        ) : null}

        {showWelcome ? (
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
        ) : null}

        {!isHistoryLoading && exchanges.length > 0 ? (
          <div className="chat-exchanges">
            {isLoadingMore ? (
              <div
                className="chat-history-status chat-history-status--inline"
                role="status"
              >
                <span className="spinner" aria-hidden="true" />
                Loading earlier chats…
              </div>
            ) : null}

            {!hasMoreHistory ? (
              <p className="chat-history-end">Beginning of conversation</p>
            ) : null}

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
                      <small>Cooking your answer...</small>
                    </div>
                  ) : (
                    <p>{exchange.answer}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
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
