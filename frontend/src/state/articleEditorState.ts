import { useReducer, type Dispatch } from "react";
import type {
  ArticleDataParsed,
  ArticleDataCorrected,
  ArticleMetadata,
  ArticleComponent,
  NewsArticle,
} from "../types";

export type PreviewMode = "original" | "corrected";

export interface ArticleEditorState {
  url: string;
  data_parsed: ArticleDataParsed;
  data_corrected: ArticleDataCorrected;
  activePreviewMode: PreviewMode;
}

export type ArticleEditorAction =
  | { type: "LOAD_ARTICLE"; payload: NewsArticle }
  | { type: "UPDATE_METADATA"; payload: ArticleMetadata }
  | { type: "REORDER_COMPONENTS"; payload: ArticleComponent[] }
  | { type: "UPDATE_COMPONENT"; payload: { index: number; component: ArticleComponent } }
  | { type: "ADD_COMPONENT"; payload: ArticleComponent }
  | { type: "DELETE_COMPONENT"; payload: number }
  | { type: "SET_PREVIEW_MODE"; payload: PreviewMode };

function deepCloneParsed(parsed: ArticleDataParsed): ArticleDataCorrected {
  return JSON.parse(JSON.stringify(parsed));
}

export function articleEditorReducer(
  state: ArticleEditorState,
  action: ArticleEditorAction
): ArticleEditorState {
  switch (action.type) {
    case "LOAD_ARTICLE": {
      const { url, data_parsed, data_corrected } = action.payload;
      return {
        url,
        data_parsed,
        data_corrected,
        activePreviewMode: "corrected",
      };
    }

    case "UPDATE_METADATA":
      return {
        ...state,
        data_corrected: {
          ...state.data_corrected,
          metadata: action.payload,
        },
      };

    case "REORDER_COMPONENTS":
      return {
        ...state,
        data_corrected: {
          ...state.data_corrected,
          components: action.payload,
        },
      };

    case "UPDATE_COMPONENT": {
      const { index, component } = action.payload;
      const components = [...state.data_corrected.components];
      if (index >= 0 && index < components.length) {
        components[index] = component;
      }
      return {
        ...state,
        data_corrected: {
          ...state.data_corrected,
          components,
        },
      };
    }

    case "ADD_COMPONENT":
      return {
        ...state,
        data_corrected: {
          ...state.data_corrected,
          components: [...state.data_corrected.components, action.payload],
        },
      };

    case "DELETE_COMPONENT": {
      const index = action.payload;
      const components = state.data_corrected.components.filter((_, i) => i !== index);
      return {
        ...state,
        data_corrected: {
          ...state.data_corrected,
          components,
        },
      };
    }

    case "SET_PREVIEW_MODE":
      return {
        ...state,
        activePreviewMode: action.payload,
      };

    default:
      return state;
  }
}

const initialState: ArticleEditorState = {
  url: "",
  data_parsed: { metadata: defaultMetadata(), components: [] },
  data_corrected: { metadata: defaultMetadata(), components: [] },
  activePreviewMode: "corrected",
};

function defaultMetadata(): ArticleMetadata {
  return {
    title: "",
    authors: [],
    categories: [],
    tags: [],
  };
}

export function initializeStateFromUpload(raw: {
  url: string;
  data_parsed: ArticleDataParsed;
}): ArticleEditorState {
  const data_corrected = deepCloneParsed(raw.data_parsed);
  return {
    url: raw.url,
    data_parsed: raw.data_parsed,
    data_corrected,
    activePreviewMode: "corrected",
  };
}

export function buildLoadPayload(raw: {
  url: string;
  data_parsed: ArticleDataParsed;
}): NewsArticle {
  return {
    url: raw.url,
    data_parsed: raw.data_parsed,
    data_corrected: deepCloneParsed(raw.data_parsed),
  };
}

export function getInitialState(): ArticleEditorState {
  return JSON.parse(JSON.stringify(initialState));
}

export function useArticleEditor(): [
  ArticleEditorState,
  Dispatch<ArticleEditorAction>,
] {
  return useReducer(articleEditorReducer, undefined, getInitialState);
}

export { defaultMetadata };
