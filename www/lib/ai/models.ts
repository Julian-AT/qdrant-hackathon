export const DEFAULT_CHAT_MODEL: string = "chat-model";

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model",
    name: "Mistral 7B",
    description: "Latest model from Mistral",
    icon: "/mistral.webp",
  },
  {
    id: "chat-model-reasoning",
    name: "GPT-5",
    description: "Latest model from OpenAI",
    icon: "/openai.png",
  },
];
