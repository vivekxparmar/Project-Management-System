export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface ChatAttachment {
  url: string;
  publicId: string;
  type: string;
  originalName: string;
}

export interface ChatMessage {
  _id: string;
  projectId: string;
  sender: ChatUser;
  content: string;
  type: "text" | "image" | "file";
  attachments: ChatAttachment[];
  mentions: string[];
  reactions: Record<string, string[]>;
  isEdited: boolean;
  editedAt: string | null;
  deletedAt: string | null;

  // OPTIONAL FALLBACKS (from backend)
  senderName?: string;
  senderAvatar?: string | null;
  createdAt: string;
  updatedAt: string;
}
