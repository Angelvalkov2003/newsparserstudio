import type { ArticleComponent, ArticleComponentType } from "../../types";
import { COMPONENT_TYPES } from "../../types";

const VALID_TYPES = new Set<string>(COMPONENT_TYPES);

export function generateComponentId(): string {
  return `inserted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ValidateResultSuccess {
  success: true;
  component: ArticleComponent;
}

export interface ValidateResultError {
  success: false;
  error: string;
}

export type ValidateComponentJsonResult =
  | ValidateResultSuccess
  | ValidateResultError;

export interface ValidateComponentObjectOptions {
  keepId?: string;
  keepType?: string;
}

export function validateComponentObject(
  parsed: unknown,
  options?: ValidateComponentObjectOptions
): ValidateComponentJsonResult {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { success: false, error: "Expected a JSON object (component)." };
  }

  const obj = parsed as Record<string, unknown>;
  let type = obj.type;
  if (typeof type !== "string") {
    return { success: false, error: "Missing or invalid \"type\" field." };
  }
  if (options?.keepType !== undefined) {
    type = options.keepType;
  }
  if (!VALID_TYPES.has(type as string)) {
    return {
      success: false,
      error: `Invalid component type "${type}". Allowed: ${COMPONENT_TYPES.join(", ")}.`,
    };
  }

  const id =
    options?.keepId !== undefined
      ? options.keepId
      : typeof obj.id === "string" && obj.id.trim() !== ""
        ? obj.id.trim()
        : generateComponentId();

  const component = { ...obj, id, type } as Record<string, unknown>;
  const requiredError = validateRequiredFields(type as ArticleComponentType, component);
  if (requiredError) {
    return { success: false, error: requiredError };
  }
  return { success: true, component: component as ArticleComponent };
}

export function validateComponentJson(
  raw: string
): ValidateComponentJsonResult {
  if (raw.trim() === "") {
    return { success: false, error: "JSON is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    return { success: false, error: `Invalid JSON: ${message}` };
  }
  return validateComponentObject(parsed);
}

function validateRequiredFields(
  type: ArticleComponentType,
  obj: Record<string, unknown>
): string | null {
  switch (type) {
    case "heading":
      return typeof obj.text === "string"
        ? null
        : "Component type \"heading\" requires \"text\" (string).";
    case "paragraph":
      return typeof obj.text === "string"
        ? null
        : "Component type \"paragraph\" requires \"text\" (string).";
    case "image":
      return null; // all optional
    case "link":
      if (typeof obj.text !== "string")
        return "Component type \"link\" requires \"text\" (string).";
      if (typeof obj.url !== "string")
        return "Component type \"link\" requires \"url\" (string).";
      return null;
    case "code_block":
      return typeof obj.code === "string"
        ? null
        : "Component type \"code_block\" requires \"code\" (string).";
    case "equation":
      return typeof obj.latex === "string"
        ? null
        : "Component type \"equation\" requires \"latex\" (string).";
    case "citation":
      return typeof obj.citation_text === "string"
        ? null
        : "Component type \"citation\" requires \"citation_text\" (string).";
    case "footnote":
      if (typeof obj.identifier !== "string")
        return "Component type \"footnote\" requires \"identifier\" (string).";
      if (typeof obj.content !== "string")
        return "Component type \"footnote\" requires \"content\" (string).";
      return null;
    case "horizontal_ruler":
      return null;
    case "list":
      if (!Array.isArray(obj.items))
        return "Component type \"list\" requires \"items\" (array).";
      for (let i = 0; i < obj.items.length; i++) {
        const item = obj.items[i];
        if (!item || typeof item !== "object")
          return `Component type "list": items[${i}] must be an object.`;
        const r = item as Record<string, unknown>;
        if (typeof r.indent !== "number")
          return `Component type "list": items[${i}] requires "indent" (number).`;
        if (typeof r.bullet !== "string")
          return `Component type "list": items[${i}] requires "bullet" (string).`;
        if (typeof r.content !== "string")
          return `Component type "list": items[${i}] requires "content" (string).`;
      }
      return null;
    case "poll":
      if (typeof obj.question !== "string")
        return "Component type \"poll\" requires \"question\" (string).";
      if (!Array.isArray(obj.choices))
        return "Component type \"poll\" requires \"choices\" (array).";
      return null;
    case "table":
      if (!Array.isArray(obj.headers))
        return "Component type \"table\" requires \"headers\" (array).";
      if (!Array.isArray(obj.rows))
        return "Component type \"table\" requires \"rows\" (array).";
      return null;
    case "video":
      return typeof obj.url === "string"
        ? null
        : "Component type \"video\" requires \"url\" (string).";
    default:
      return `Unknown component type "${type}".`;
  }
}
