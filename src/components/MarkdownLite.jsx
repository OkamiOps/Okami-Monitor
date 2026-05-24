import React from "react";

/**
 * MarkdownLite — render markdown básico sem dependência externa.
 * Suporta:
 *   - Headers `#`, `##`, `###`
 *   - Bullets `- ` e `* ` (agrupa em <ul>)
 *   - Numerados `1.` `2.` (agrupa em <ol>)
 *   - Code inline ` `texto` ` (backticks)
 *   - Bold `**texto**`
 *   - Italic `*texto*`
 *   - Quebras de linha duplas como separadores de parágrafo
 *   - Quebras de linha simples preservadas dentro de parágrafos
 *
 * Use para comentários de kanban, work logs, descrições etc.
 */

// Escape HTML pra segurança antes de qualquer transformação
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline parsing: backticks → code, ** → strong, * → em
function inlineMarkdown(text) {
  let html = escapeHtml(text);
  // Code inline (precisa vir ANTES de bold/italic pra escapar conteúdo)
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-code">$1</code>');
  // Bold **text**
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text* (só se não for parte de **)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return html;
}

function detectBlock(line) {
  const trimmed = line.trimStart();
  if (/^#{1,3}\s+/.test(trimmed)) return "header";
  if (/^[-*]\s+/.test(trimmed)) return "ul";
  if (/^\d+[.)]\s+/.test(trimmed)) return "ol";
  if (trimmed === "") return "blank";
  return "p";
}

/**
 * Pré-processa texto que perdeu quebras de linha (comum em logs/comentários que
 * o backend stripou \n). Re-injeta \n quando detecta padrões claros:
 *   - antes de `# ` `## ` `### ` no meio do texto → header
 *   - antes de ` - ` depois de `.`, `:`, `?`, `!` → bullet
 *   - antes de ` N. ` (numerado) precedido de pontuação → ordered list
 *   - antes de "Palavra:" (capitalizada seguida de :) → seção inline
 * Não toca em texto que já tem \n nos lugares certos.
 */
function normalizeMarkdownish(text) {
  let s = text;
  // Já tem newlines reais? Mantém — só normaliza CRLF
  if (/\n/.test(s)) return s.replace(/\r\n/g, "\n");

  // Quebras antes de headers (# ## ###)
  s = s.replace(/\s+(#{1,3}\s+)/g, "\n\n$1");

  // Quebras antes de bullets " - " ou " * " precedidos de pontuação
  s = s.replace(/([.:;?!])\s+([-*])\s+/g, "$1\n$2 ");

  // Quebra entre múltiplos bullets contínuos (" - texto - texto")
  s = s.replace(/([^\n])\s+-\s+(?=[A-Z`\[\(])/g, "$1\n- ");

  // Quebras antes de itens numerados " 1. texto" no meio do parágrafo
  s = s.replace(/([.:;?!])\s+(\d+[.)]\s+)/g, "$1\n$2");
  s = s.replace(/([^\d\n])\s+(\d+[.)]\s+)(?=[A-Z`])/g, "$1\n$2");

  // Seções inline tipo "Contexto:", "Problema:", "Regras duras:"
  // Capitalized word (acentos incl.) optionally followed by extra word + ":"
  s = s.replace(
    /([.!?])\s+([A-ZÁÉÍÓÚÇÂÊÔÃÕ][\wÀ-ÿ]+(?:\s+[\wÀ-ÿ]+){0,2}:)/g,
    "$1\n\n$2",
  );

  // Headings-like inline "1. Pastas/documents com IDs no root:" preserva newline
  s = s.replace(/(\.)\s+(\d+\.\s+[A-ZÁ-Ú])/g, "$1\n$2");

  return s;
}

export function MarkdownLite({ source, className = "" }) {
  if (!source || typeof source !== "string") return null;

  const normalized = normalizeMarkdownish(source);
  const lines = normalized.replace(/\r\n/g, "\n").split("\n");

  const blocks = [];
  let buffer = [];
  let currentType = null;

  const flush = () => {
    if (!buffer.length) return;
    blocks.push({ type: currentType, lines: buffer });
    buffer = [];
  };

  for (const line of lines) {
    const type = detectBlock(line);
    if (type === "blank") {
      flush();
      currentType = null;
      continue;
    }
    // Agrupa bullets/numerados em listas, parágrafos em bloco contínuo,
    // mas headers ficam isolados.
    if (type === "header") {
      flush();
      blocks.push({ type: "header", lines: [line] });
      currentType = null;
      continue;
    }
    if (type !== currentType) {
      flush();
      currentType = type;
    }
    buffer.push(line);
  }
  flush();

  return (
    <div className={`md-lite ${className}`.trim()}>
      {blocks.map((block, i) => {
        if (block.type === "header") {
          const raw = block.lines[0].trimStart();
          const level = (raw.match(/^#+/) || [""])[0].length;
          const Tag = `h${Math.min(level + 2, 6)}`;
          const content = raw.replace(/^#+\s+/, "");
          return (
            <Tag key={i} className="md-h" dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }} />
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="md-ul">
              {block.lines.map((line, j) => {
                const content = line.replace(/^\s*[-*]\s+/, "");
                return (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }} />
                );
              })}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="md-ol">
              {block.lines.map((line, j) => {
                const content = line.replace(/^\s*\d+[.)]\s+/, "");
                return (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }} />
                );
              })}
            </ol>
          );
        }
        // p block — preserva quebras simples dentro do parágrafo
        const html = block.lines
          .map((l) => inlineMarkdown(l))
          .join("<br/>");
        return (
          <p key={i} className="md-p" dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </div>
  );
}
