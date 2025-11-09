const DEFAULT_ALLOWED_GLOBALS = new Set(["Fragment"]);

function createJsxNoUndefRule(context) {
  const [options = {}] = context.options;
  const allow = new Set(options.allow ?? []);
  const allowGlobals = new Set([...(options.allowGlobals ?? []), ...DEFAULT_ALLOWED_GLOBALS]);
function shouldIgnoreIdentifier(name, allow, allowGlobals) {
  if (!name) return true;
  if (allow.has(name) || allowGlobals.has(name)) {
    return true;
  }

  const firstCharacter = name[0];
  if (!firstCharacter) return true;

  const isLowerCase = firstCharacter === firstCharacter.toLowerCase();
  if (isLowerCase) {
    return true;
  }

  return false;
}

function createJsxNoUndefRule(context) {
  const [options = {}] = context.options;
  const allowGlobals = new Set([...(options.allowGlobals ?? []), ...DEFAULT_ALLOWED_GLOBALS]);
  const allow = new Set(options.allow ?? []);
  const reported = new Set();

  return {
    "Program:exit"() {
      const through = context.sourceCode?.scopeManager?.globalScope?.through ?? [];

      for (const reference of through) {
        const identifier = reference.identifier;
        if (!identifier || identifier.type !== "JSXIdentifier") continue;

        const name = identifier.name;
        if (!name || name[0] === name[0].toLowerCase()) continue;
        if (allow.has(name) || allowGlobals.has(name)) continue;
        if (reported.has(identifier)) continue;

        reported.add(identifier);
      const scopeManager = context.sourceCode?.scopeManager;
      const globalScope = scopeManager?.globalScope;

      if (!globalScope) {
        return;
      }

      for (const reference of globalScope.through) {
        const identifier = reference.identifier;

        if (!identifier || identifier.type !== "JSXIdentifier") {
          continue;
        }

        const name = identifier.name;

        if (shouldIgnoreIdentifier(name, allow, allowGlobals)) {
          continue;
        }

        if (reported.has(identifier)) {
          continue;
        }

        reported.add(identifier);

        context.report({
          node: identifier,
          messageId: "undef",
          data: { identifier: name },
        });
      }
    },
  };
}

export default {
  meta: { name: "local-react-plugin", version: "0.0.1" },
const reactPlugin = {
  meta: {
    name: "local-react-plugin",
    version: "0.0.1",
  },
  rules: {
    "jsx-no-undef": {
      meta: {
        type: "problem",
        docs: {
          description: "Disallow using undefined JSX identifiers.",
          description: "Disallow undefined JSX identifiers.",
        },
        schema: [
          {
            type: "object",
            properties: {
              allow: { type: "array", items: { type: "string" } },
              allowGlobals: { type: "array", items: { type: "string" } },
              allow: {
                type: "array",
                items: { type: "string" },
              },
              allowGlobals: {
                type: "array",
                items: { type: "string" },
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          undef: "'{{identifier}}' must be defined when used in JSX.",
          undef: "'{{identifier}}' is not defined.",
        },
      },
      create: createJsxNoUndefRule,
    },
  },
};

export default reactPlugin;
