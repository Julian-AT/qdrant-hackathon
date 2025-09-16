import {
  customProvider,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { mistral } from "@ai-sdk/mistral";
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from "./models.test";
import { isTestEnvironment } from "@/lib/constants";

export const myProvider = isTestEnvironment
  ? customProvider({
    languageModels: {
      "chat-model-mistral": chatModel,
      "chat-model-openai": reasoningModel,
      "title-model": titleModel,
      "artifact-model": artifactModel,
    },
  })
  : customProvider({
    languageModels: {
      "chat-model-mistral": mistral("pixtral-12b-2409"),
      "chat-model-openai": openai("gpt-5"),
      "title-model": openai("gpt-4o-mini"),
      "artifact-model": openai("gpt-4o-mini"),
    },
    imageModels: {
      "small-model": openai.imageModel("dall-e-3"),
    },
  });
