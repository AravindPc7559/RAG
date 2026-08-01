import { Link, useNavigate } from "react-router-dom";

import { createChatPath, paths } from "@/app/router/paths";
import { useAppSelector } from "@/app/store/hooks";
import { selectCurrentUser } from "@/features/auth";
import { getDocumentName } from "@/features/documents/utils/getDocumentName";

export function DocumentsPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);
  const documents = currentUser?.documentUrls ?? [];

  return (
    <section className="documents-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Document</h1>
          <p>Select a document to open its chat.</p>
        </div>
        <span className="document-library__count">
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </span>
      </header>

      {documents.length ? (
        <div className="documents-page__grid">
          {documents.map((document, index) => {
            const documentName = getDocumentName(document, index);
            const canOpenChat = Boolean(document.documentId);

            return (
              <button
                key={document.documentId ?? document.publicId}
                type="button"
                className={`document-box${
                  canOpenChat ? "" : " document-box--disabled"
                }`}
                disabled={!canOpenChat}
                aria-label={
                  canOpenChat
                    ? `Open chat for ${documentName}`
                    : `${documentName} cannot be opened`
                }
                onClick={() => {
                  if (!document.documentId) {
                    return;
                  }

                  navigate(createChatPath(document.documentId), {
                    state: { documentName },
                  });
                }}
              >
                <span className="document-box__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                    <path d="M14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                </span>
                <span className="document-box__status">
                  {canOpenChat ? "Ready" : "Unavailable"}
                </span>
                <h3 className="document-box__title" title={documentName}>
                  {documentName}
                </h3>
                <span className="document-box__hint">
                  {canOpenChat ? "Open chat" : "Re-upload needed"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="document-library__empty">
          <p>No documents yet. Upload one from Overview to get started.</p>
          <Link to={paths.dashboard} className="button button--secondary">
            Go to Overview
          </Link>
        </div>
      )}
    </section>
  );
}
