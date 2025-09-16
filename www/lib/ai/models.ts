export const DEFAULT_CHAT_MODEL: string = "chat-model-mistral";

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model-mistral",
    name: "Ministral 8B",
    description: "Frontier model from Mistral",
    icon: "/mistral.webp",
  },
  {
    id: "chat-model-openai",
    name: "GPT-5",
    description: "Latest model from OpenAI",
    icon: "/openai.png",
  },
];
