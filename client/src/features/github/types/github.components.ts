import type { GithubRepository, GithubStatus } from "@/features/github/types/github.types";
import type { KnowledgeRepoState } from "@/features/knowledge/types/knowledge.types";

export interface GithubRepoCardProps {
  repository: GithubRepository;
  knowledge?: KnowledgeRepoState;
  onViewDetails: (repository: GithubRepository) => void;
  onSync: (repository: GithubRepository) => void;
  onImport: (repository: GithubRepository) => void;
  onOpenChat: (repository: GithubRepository) => void;
  onOpenPullRequests?: (repository: GithubRepository) => void;
}

export interface GithubConnectionHeaderProps {
  connection: GithubStatus;
  isDisconnecting: boolean;
  onDisconnect: () => void;
}

export interface GithubEmptyStateProps {
  onConnect: () => void;
  isConnecting?: boolean;
}

export interface GithubRepoDetailsModalProps {
  repository: GithubRepository | null;
  isLoading: boolean;
  onClose: () => void;
}
