"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  SlidersHorizontal,
  ArrowUp,
  X,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { VisibilityType } from "./visibility-selector";
import type { Attachment, ChatMessage } from "@/lib/types";
import { chatModels } from "@/lib/ai/models";
import { saveChatModelAsCookie } from "@/app/(scene)/actions";
import { startTransition } from "react";
import { useScene } from "@/hooks/use-scene";
import { toast } from "sonner";
import Image from "next/image";
import { PreferencesPopover } from "./preferences-popover";

// Types
export interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  type: string;
  uploadStatus: "pending" | "uploading" | "complete" | "error";
  uploadProgress?: number;
  abortController?: AbortController;
  textContent?: string;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
  wordCount: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  icon: string;
}

interface ChatInputProps {
  sceneId: string;
  input: string;
  setInput: (input: string) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: (attachments: Array<Attachment>) => void;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onSendMessage?: (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[],
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  models?: ModelOption[];
  defaultModel?: string;
  onModelChange?: (modelId: string) => void;
}

// Constants
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PASTE_THRESHOLD = 200; // characters threshold for showing as pasted content

// Animated placeholder messages
const PLACEHOLDER_MESSAGES = [
  "Describe your ideal room setup...",
  "Ask me to find furniture for your space...",
  "Upload an image and I'll help redesign it...",
  "Tell me about your style preferences...",
  "What kind of atmosphere are you going for?",
  "Describe the room you want to create...",
  "Ask for suggestions based on your budget...",
  "Upload a floor plan and let's design together...",
];

// Typing Animation Component
const TypingPlaceholder: React.FC<{
  text: string;
  className?: string;
  duration?: number;
  onComplete?: () => void;
}> = ({ text, className, duration = 100, onComplete }) => {
  const [displayedText, setDisplayedText] = useState<string>("");

  useEffect(() => {
    setDisplayedText("");
    const graphemes = Array.from(text);
    let i = 0;

    const typingEffect = setInterval(() => {
      if (i < graphemes.length) {
        setDisplayedText(graphemes.slice(0, i + 1).join(""));
        i++;
      } else {
        clearInterval(typingEffect);
        onComplete?.();
      }
    }, duration);

    return () => {
      clearInterval(typingEffect);
    };
  }, [text, duration, onComplete]);

  return <span className={className}>{displayedText}</span>;
};

// File type helpers
const getFileIcon = (type: string) => {
  if (type.startsWith("image/"))
    return <ImageIcon className="h-5 w-5 text-zinc-400" />;
  if (type.startsWith("video/"))
    return <Video className="h-5 w-5 text-zinc-400" />;
  if (type.startsWith("audio/"))
    return <Music className="h-5 w-5 text-zinc-400" />;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
    return <Archive className="h-5 w-5 text-zinc-400" />;
  return <FileText className="h-5 w-5 text-zinc-400" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};

const getFileTypeLabel = (type: string): string => {
  const parts = type.split("/");
  let label = parts[parts.length - 1].toUpperCase();
  if (label.length > 7 && label.includes("-")) {
    // e.g. VND.OPENXMLFORMATS-OFFICEDOCUMENT...
    label = label.substring(0, label.indexOf("-"));
  }
  if (label.length > 10) {
    label = label.substring(0, 10) + "...";
  }
  return label;
};

// Helper function to check if a file is textual
const isTextualFile = (file: File): boolean => {
  const textualTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
  ];

  const textualExtensions = [
    "txt",
    "md",
    "py",
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "json",
    "xml",
    "yaml",
    "yml",
    "csv",
    "sql",
    "sh",
    "bash",
    "php",
    "rb",
    "go",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "rs",
    "swift",
    "kt",
    "scala",
    "r",
    "vue",
    "svelte",
    "astro",
    "config",
    "conf",
    "ini",
    "toml",
    "log",
    "gitignore",
    "dockerfile",
    "makefile",
    "readme",
  ];

  // Check MIME type
  const isTextualMimeType = textualTypes.some((type) =>
    file.type.toLowerCase().startsWith(type),
  );

  // Check file extension
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const isTextualExtension =
    textualExtensions.includes(extension) ||
    file.name.toLowerCase().includes("readme") ||
    file.name.toLowerCase().includes("dockerfile") ||
    file.name.toLowerCase().includes("makefile");

  return isTextualMimeType || isTextualExtension;
};

// Helper function to read file content as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Helper function to get file extension for badge
const getFileExtension = (filename: string): string => {
  const extension = filename.split(".").pop()?.toUpperCase() || "FILE";
  return extension.length > 8 ? extension.substring(0, 8) + "..." : extension;
};

function PureMultimodalInput({
  sceneId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
}: ChatInputProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState(selectedModelId);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { setScene } = useScene();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight =
        Number.parseInt(getComputedStyle(textareaRef.current).maxHeight, 10) ||
        120;
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        maxHeight,
      )}px`;
    }
  }, [input]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const switchToNextPlaceholder = useCallback(() => {
    setCurrentPlaceholder((prev) => (prev + 1) % PLACEHOLDER_MESSAGES.length);
    setIsTypingComplete(false);
  }, []);

  useEffect(() => {
    if (isTypingComplete) {
      const timeout = setTimeout(() => {
        switchToNextPlaceholder();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isTypingComplete, switchToNextPlaceholder]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      setIsTypingComplete(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (input) {
      setIsTypingComplete(false);
    }
  }, [input]);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const currentFileCount = files.length;
      if (currentFileCount >= MAX_FILES) {
        alert(
          `Maximum ${MAX_FILES} files allowed. Please remove some files to add new ones.`,
        );
        return;
      }

      const availableSlots = MAX_FILES - currentFileCount;
      const filesToAdd = Array.from(selectedFiles).slice(0, availableSlots);

      if (selectedFiles.length > availableSlots) {
        alert(
          `You can only add ${availableSlots} more file(s). ${
            selectedFiles.length - availableSlots
          } file(s) were not added.`,
        );
      }

      const newFiles = filesToAdd
        .filter((file) => {
          if (file.size > MAX_FILE_SIZE) {
            alert(
              `File ${file.name} (${formatFileSize(
                file.size,
              )}) exceeds size limit of ${formatFileSize(MAX_FILE_SIZE)}.`,
            );
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: Math.random().toString(),
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
          type: file.type || "application/octet-stream",
          uploadStatus: "pending" as const,
          uploadProgress: 0,
        }));

      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((fileToUpload) => {
        if (isTextualFile(fileToUpload.file)) {
          readFileAsText(fileToUpload.file)
            .then((textContent) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileToUpload.id ? { ...f, textContent } : f,
                ),
              );
            })
            .catch((error) => {
              console.error("Error reading file content:", error);
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileToUpload.id
                    ? { ...f, textContent: "Error reading file content" }
                    : f,
                ),
              );
            });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id ? { ...f, uploadStatus: "uploading" } : f,
          ),
        );

        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20 + 5;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileToUpload.id
                  ? { ...f, uploadStatus: "complete", uploadProgress: 100 }
                  : f,
              ),
            );
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileToUpload.id
                  ? { ...f, uploadProgress: progress }
                  : f,
              ),
            );
          }
        }, 150);
      });
    },
    [files.length],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = e.clipboardData;
      const items = clipboardData.items;

      const fileItems = Array.from(items).filter(
        (item) => item.kind === "file",
      );
      if (fileItems.length > 0 && files.length < MAX_FILES) {
        e.preventDefault();
        const pastedFiles = fileItems
          .map((item) => item.getAsFile())
          .filter(Boolean) as File[];
        const dataTransfer = new DataTransfer();
        pastedFiles.forEach((file) => dataTransfer.items.add(file));
        handleFileSelect(dataTransfer.files);
        return;
      }

      const textData = clipboardData.getData("text");
      if (
        textData &&
        textData.length > PASTE_THRESHOLD &&
        pastedContent.length < 5
      ) {
        e.preventDefault();
        setInput(input + textData.slice(0, PASTE_THRESHOLD) + "...");

        const pastedItem: PastedContent = {
          id: Math.random().toString(),
          content: textData,
          timestamp: new Date(),
          wordCount: textData.split(/\s+/).filter(Boolean).length,
        };

        setPastedContent((prev) => [...prev, pastedItem]);
      }
    },
    [handleFileSelect, files.length, pastedContent.length, input, setInput],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  const handleSend = useCallback(() => {
    if (status !== "ready") {
      toast.error("Please wait for the model to finish its response!");
      return;
    }

    window.history.replaceState({}, "", `/scene/${sceneId}`);

    const fileAttachments = files.map((file) => ({
      url: file.preview || URL.createObjectURL(file.file),
      name: file.file.name,
      contentType: file.file.type,
    }));

    sendMessage({
      role: "user",
      parts: [
        ...fileAttachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setScene((prevScene) => ({
      ...prevScene,
      id: sceneId,
      isLoading: true,
      statusMessage: "Generating scene...",
      error: null,
      progress: 0,
      image: null,
    }));

    setAttachments(fileAttachments);
    setInput("");
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [
    input,
    files,
    pastedContent,
    status,
    sendMessage,
    setAttachments,
    setInput,
    sceneId,
    setScene,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasContent =
    input.trim() || files.length > 0 || pastedContent.length > 0;
  const canSend =
    hasContent &&
    status === "ready" &&
    !files.some((f) => f.uploadStatus === "uploading");

  return (
    <div
      className="relative w-full max-w-3xl mx-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-card border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm text-blue-500 flex items-center gap-2">
            <ImageIcon className="size-4 opacity-50" />
            Drop files here to add to chat
          </p>
        </div>
      )}

      <div
        className={cn(
          "bg-card border rounded-xl shadow-lg items-end gap-2 min-h-[150px] flex flex-col",
          messages.length > 0 && "min-h-[125px] max-h-[125px]",
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={messages.length > 0 ? "Type your message..." : ""}
          disabled={status !== "ready"}
          className="flex-1 min-h-[75px] w-full p-4 focus-within:border-none focus:outline-none focus:border-none border-none outline-none focus-within:ring-0 focus-within:ring-offset-0 focus-within:outline-none max-h-[120px] resize-none border-0 bg-transparent text-zinc-100 shadow-none focus-visible:ring-0 placeholder:text-zinc-500 text-sm sm:text-base custom-scrollbar"
          rows={1}
        />

        {/* Typing Animated Placeholder */}
        {messages.length === 0 && (
          <div className="absolute inset-0 flex items-start pt-4 pl-4 pointer-events-none">
            {!input && (
              <TypingPlaceholder
                key={`current-placeholder-${currentPlaceholder}`}
                text={PLACEHOLDER_MESSAGES[currentPlaceholder]}
                className="text-zinc-500 text-sm sm:text-base font-normal w-[calc(100%-2rem)]"
                duration={75}
                onComplete={handleTypingComplete}
              />
            )}
          </div>
        )}
        <div className="flex items-center gap-2 justify-between w-full px-3 pb-1.5">
          <div className="flex items-center gap-2">
            {messages.length === 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-background flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status !== "ready" || files.length >= MAX_FILES}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {files.length >= MAX_FILES
                      ? `Max ${MAX_FILES} files reached`
                      : "Attach files"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <PreferencesPopover
              sceneId={sceneId}
              selectedVisibilityType={selectedVisibilityType}
            />
          </div>
          <div className="flex items-center gap-2">
            <ModelSelectorDropdown
              models={chatModels.map((model) => ({
                id: model.id,
                name: model.name,
                description: model.description,
                badge: model.id === "Mistral 7B" ? "Latest" : undefined,
                icon: model.icon,
              }))}
              selectedModel={selectedModel}
              onModelChange={(modelId) => {
                setSelectedModel(modelId);
                startTransition(() => {
                  saveChatModelAsCookie(modelId);
                });
              }}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 p-0 flex-shrink-0 transition-colors rounded-full",
                    canSend
                      ? "bg-primary text-primary-foreground cursor-pointer"
                      : "bg-card border text-muted-foreground cursor-not-allowed",
                  )}
                  onClick={handleSend}
                  disabled={!canSend}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {canSend ? "Send message" : "Enter a message or attach files"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {(files.length > 0 || pastedContent.length > 0) && (
          <div className="overflow-x-auto border-t-[1px] p-3 w-full bg-card hide-scroll-bar rounded-b-xl">
            <div className="flex gap-3">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((c) => c.id !== id))
                  }
                />
              ))}
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
}

// File Preview Component
const FilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/");
  const isTextual = isTextualFile(file.file);

  // If it's a textual file, use the TextualFilePreviewCard
  if (isTextual) {
    return <TextualFilePreviewCard file={file} onRemove={onRemove} />;
  }

  return (
    <div
      className={cn(
        "relative group border w-fit rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden",
        isImage ? "p-0" : "p-3",
      )}
    >
      <div className="flex items-start gap-3 size-[125px] overflow-hidden">
        {isImage && file.preview ? (
          <div className="relative size-full rounded-md overflow-hidden bg-zinc-600">
            <img
              src={file.preview || "/placeholder.svg"}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <></>
        )}
        {!isImage && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#30302E] from-transparent overflow-hidden">
                <p className="absolute bottom-2 left-2 capitalize text-white text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
                  {getFileTypeLabel(file.type)}
                </p>
              </div>
              {file.uploadStatus === "uploading" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              )}
              {file.uploadStatus === "error" && (
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>

            <p
              className="max-w-[90%] text-xs font-medium text-zinc-100 truncate"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        )}
      </div>
      <Button
        size="icon"
        variant="outline"
        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(file.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Pasted Content Preview Component
const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewText = content.content.slice(0, 150);
  const needsTruncation = content.content.length > 150;

  return (
    <div className="bg-card border relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden">
      <div className="text-[8px] text-zinc-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar">
        {isExpanded || !needsTruncation ? content.content : previewText}
        {!isExpanded && needsTruncation && "..."}
      </div>
      {/* OVERLAY */}
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-card from-transparent overflow-hidden">
        <p className="capitalize text-white text-xs bg-zinc-800 border px-2 py-1 rounded-md">
          PASTED
        </p>
        {/* Actions */}
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 flex items-center gap-0.5 absolute top-2 right-2">
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => navigator.clipboard.writeText(content.content)}
            title="Copy content"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => onRemove(content.id)}
            title="Remove content"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ModelSelectorDropdown: React.FC<{
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}> = ({ models, selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModelData =
    models.find((m) => m.id === selectedModel) || models[0];

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700"
            >
              <img
                src={selectedModelData.icon}
                alt={selectedModelData.name}
                width={12}
                height={12}
              />
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {selectedModelData.name}
              </span>
              <ChevronDown
                className={cn(
                  "ml-1 h-4 w-4 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select Model</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-72 p-2 bg-card border rounded-lg shadow-xl"
        side="top"
        align="end"
        sideOffset={8}
      >
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            className={cn(
              "w-full text-left p-2.5 rounded-md hover:bg-secondary transition-colors flex items-center justify-between",
              model.id === selectedModel && "bg-secondary",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleModelSelect(model.id);
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <img src={model.icon} alt={model.name} width={16} height={16} />
                <span className="font-medium text-zinc-100">{model.name}</span>
                {model.badge && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                    {model.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {model.description}
              </p>
            </div>
            {model.id === selectedModel && (
              <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const TextualFilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewText = file.textContent?.slice(0, 150) || "";
  const needsTruncation = (file.textContent?.length || 0) > 150;
  const fileExtension = getFileExtension(file.file.name);

  return (
    <div className="bg-card border relative rounded-lg p-3 size-[125px] shadow-md flex-shrink-0 overflow-hidden">
      <div className="text-[8px] text-zinc-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar">
        {file.textContent ? (
          <>
            {isExpanded || !needsTruncation ? file.textContent : previewText}
            {!isExpanded && needsTruncation && "..."}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-card from-transparent overflow-hidden">
        <p className="capitalize text-white text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
          {fileExtension}
        </p>
        {file.uploadStatus === "uploading" && (
          <div className="absolute top-2 left-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          </div>
        )}
        {file.uploadStatus === "error" && (
          <div className="absolute top-2 left-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          </div>
        )}
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300 flex items-center gap-0.5 absolute top-2 right-2">
          {file.textContent && (
            <Button
              size="icon"
              variant="outline"
              className="size-6"
              onClick={() =>
                navigator.clipboard.writeText(file.textContent || "")
              }
              title="Copy content"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="size-6"
            onClick={() => onRemove(file.id)}
            title="Remove file"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const MultimodalInput = PureMultimodalInput;
