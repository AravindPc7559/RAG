import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

const EXTRACTION_PREVIEW_DURATION_MS = 3000;

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DashboardPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isExtracting) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const extractionPreview = window.setTimeout(() => {
      setIsExtracting(false);
      setIsReady(true);
    }, EXTRACTION_PREVIEW_DURATION_MS);

    return () => {
      window.clearTimeout(extractionPreview);
      document.body.style.overflow = previousOverflow;
    };
  }, [isExtracting]);

  const selectDocument = (file?: File) => {
    if (!file) {
      return;
    }

    setUploadedFile(file);
    setIsReady(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectDocument(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectDocument(event.dataTransfer.files[0]);
  };

  const removeDocument = () => {
    setUploadedFile(null);
    setIsReady(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <section className="document-workspace">
        <header className="document-workspace__heading">
          <span className="eyebrow">Your knowledge starts here</span>
          <h1>Ask your documents anything.</h1>
          <p>
            Upload a document and we&apos;ll turn it into clear, useful answers
            in seconds.
          </p>
        </header>

        <div
          className={`document-upload${isDragging ? " document-upload--dragging" : ""}${
            uploadedFile ? " document-upload--selected" : ""
          }`}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {!uploadedFile ? (
            <>
              <span className="document-upload__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                  <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                </svg>
              </span>
              <div className="document-upload__copy">
                <h2>Upload a document</h2>
                <p>Drag and drop your file here, or choose it from your device.</p>
              </div>
              <button
                type="button"
                className="button button--primary document-upload__button"
                onClick={() => inputRef.current?.click()}
              >
                Choose document
              </button>
              <input
                ref={inputRef}
                className="document-upload__input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              <span className="document-upload__hint">
                PDF, DOC, DOCX or TXT
              </span>
            </>
          ) : (
            <div className="selected-document">
              <span className="selected-document__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                  <path d="M14 3v5h5M9 13h6M9 17h4" />
                </svg>
              </span>
              <div className="selected-document__details">
                <span className={`selected-document__status${isReady ? " is-ready" : ""}`}>
                  {isReady ? "Ready" : "Document uploaded"}
                </span>
                <h2>{uploadedFile.name}</h2>
                <p>
                  {formatFileSize(uploadedFile.size)}
                  {isReady
                    ? " · Content extracted and ready for questions"
                    : " · Ready to extract"}
                </p>
              </div>
              <button
                type="button"
                className="selected-document__remove"
                onClick={removeDocument}
                aria-label={`Remove ${uploadedFile.name}`}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m7 7 10 10M17 7 7 17" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {uploadedFile && (
          <div className="document-action">
            <button
              type="button"
              className="ask-button"
              onClick={() => setIsExtracting(true)}
            >
              <span>ASK</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </button>
            <p>We&apos;ll extract and organize the document before you begin.</p>
          </div>
        )}
      </section>

      {isExtracting && (
        <div
          className="extraction-loader"
          role="status"
          aria-live="assertive"
          aria-label={`Extracting ${uploadedFile?.name ?? "document"}`}
        >
          <div className="extraction-loader__glow" aria-hidden="true" />
          <div className="extraction-loader__content">
            <div className="extraction-animation" aria-hidden="true">
              <span className="extraction-animation__document">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                  <path d="M14 3v5h5M9 13h6M9 17h4" />
                </svg>
              </span>
              <span className="extraction-animation__orbit" />
              <span className="extraction-animation__spark extraction-animation__spark--one" />
              <span className="extraction-animation__spark extraction-animation__spark--two" />
              <span className="extraction-animation__spark extraction-animation__spark--three" />
            </div>
            <span className="extraction-loader__eyebrow">Preparing your knowledge</span>
            <h2>Extracting your document</h2>
            <p>
              We&apos;re reading and organizing the content so every answer is
              grounded in your file.
            </p>
            <div className="extraction-progress" aria-hidden="true">
              <span />
            </div>
            <div className="extraction-loader__steps" aria-hidden="true">
              <span>Reading content</span>
              <span>Finding context</span>
              <span>Preparing answers</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
