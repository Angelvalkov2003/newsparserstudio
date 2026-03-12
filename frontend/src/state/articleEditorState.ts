import { useReducer, type Dispatch } from "react";
import type {
  ArticleDataParsed,
  ArticleDataCorrected,
  ArticleMetadata,
  ArticleComponent,
} from "../types";

export interface LoadArticlePayload {
  url: string;
  data_parsed: ArticleDataParsed;
  /** What was in file as data_corrected (for right panel). If null in file, pass empty. */
  data_corrected_loaded: ArticleDataCorrected;
}

export type PreviewMode = "original" | "corrected";

export interface ArticleEditorState {
  url: string;
  data_parsed: ArticleDataParsed;
  /** Editable copy for left panel; always initialized from data_parsed on load. */
  data_corrected: ArticleDataCorrected;
  /** data_corrected from file for right panel only; if file had null, empty. */
  data_corrected_loaded: ArticleDataCorrected;
  activePreviewMode: PreviewMode;
}

export type ArticleEditorAction =
  | { type: "LOAD_ARTICLE"; payload: LoadArticlePayload }
  | { type: "UPDATE_METADATA"; payload: ArticleMetadata }
  | { type: "REORDER_COMPONENTS"; payload: ArticleComponent[] }
  | { type: "UPDATE_COMPONENT"; payload: { index: number; component: ArticleComponent } }
  | { type: "ADD_COMPONENT"; payload: ArticleComponent }
  | { type: "DELETE_COMPONENT"; payload: number }
  | { type: "SET_PREVIEW_MODE"; payload: PreviewMode }
  | { type: "SET_URL"; payload: string };

function deepCloneParsed(parsed: ArticleDataParsed): ArticleDataCorrected {
  return JSON.parse(JSON.stringify(parsed));
}

export function articleEditorReducer(
  state: ArticleEditorState,
  action: ArticleEditorAction
): ArticleEditorState {
  switch (action.type) {
    case "LOAD_ARTICLE": {
      const { url, data_parsed, data_corrected_loaded } = action.payload;
      return {
        url,
        data_parsed,
        data_corrected: deepCloneParsed(data_parsed),
        data_corrected_loaded,
        activePreviewMode: "original",
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

    case "SET_URL":
      return {
        ...state,
        url: action.payload,
      };

    default:
      return state;
  }
}

const emptyData = () => ({ metadata: defaultMetadata(), components: [] });

const initialState: ArticleEditorState = {
  url: "",
  data_parsed: emptyData(),
  data_corrected: emptyData(),
  data_corrected_loaded: emptyData(),
  activePreviewMode: "original",
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
  data_corrected_loaded?: ArticleDataCorrected;
}): ArticleEditorState {
  const data_corrected_loaded = raw.data_corrected_loaded ?? deepCloneParsed(getEmptyParsed());
  return {
    url: raw.url,
    data_parsed: raw.data_parsed,
    data_corrected: deepCloneParsed(raw.data_parsed),
    data_corrected_loaded,
    activePreviewMode: "corrected",
  };
}

export function getEmptyParsed(): ArticleDataParsed {
  return { metadata: defaultMetadata(), components: [] };
}

/** Builds payload for LOAD_ARTICLE: left = data_parsed, right = data_corrected from file (or empty). */
export function buildLoadPayload(raw: {
  url: string;
  data_parsed: ArticleDataParsed | null;
  data_corrected?: ArticleDataCorrected | null;
}): LoadArticlePayload {
  const data_parsed = raw.data_parsed ?? getEmptyParsed();
  const data_corrected_loaded =
    raw.data_corrected != null ? deepCloneParsed(raw.data_corrected) : deepCloneParsed(getEmptyParsed());
  return {
    url: raw.url,
    data_parsed,
    data_corrected_loaded,
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
