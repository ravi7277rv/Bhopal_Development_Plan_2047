import React, { useMemo } from 'react';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
type Block =
  | { kind: 'metadata'; label: string; value: string }
  | { kind: 'section-header'; number: string; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; number: string; text: string }
  | { kind: 'paragraph'; text: string };

interface DescriptionRendererProps {
  description: string;
}

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

/** Known metadata labels that appear in these Hindi objection letters. */
const METADATA_LABELS = [
  'आवेदक',
  'पता',
  'मोबाइल',
  'मो',
  'दिनांक',
  'सेवा में',
  'संबंधित भूमि',
  'विषय',
  'आपत्ति विषय',
  'प्रति',
  'प्रेषक',
  'नाम',
  'पिता का नाम',
  'ईमेल',
  'Email',
];

/**
 * Hindi section-end markers that typically indicate the start of a metadata
 * block. When we encounter these, we know the previous content ends.
 */
const SECTION_BOUNDARIES = [
  'महोदय',
  'विनम्र निवेदन',
  'प्रार्थना',
  'भवदीय',
  'सादर',
  'धन्यवाद',
];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const containsHindi = (text: string): boolean => /[\u0900-\u097F]/.test(text);

/**
 * Step 1: Insert newlines before numbered sections ("1. ", "2. " ... "10. ")
 * and before bullets ("• ") if the source has them inline.
 */
const insertStructuralBreaks = (text: string): string => {
  return text
    // Break before " 1. " (space + digit + dot + space)
    .replace(/(\s)(\d{1,2})\.\s+/g, '\n$1$2. ')
    // Break before bullets
    .replace(/\s([•▪●○])\s+/g, '\n$1 ')
    // Break after "महोदय," (body start marker)
    .replace(/(महोदय[,,]?)\s+/g, '$1\n')
    // Break after known section-boundary words
    .replace(
      new RegExp(`(${SECTION_BOUNDARIES.join('|')})[\\s:]*`, 'g'),
      '$1\n'
    )
    // Normalize multiple newlines
    .replace(/\n{3,}/g, '\n\n');
};

/**
 * Step 2: Detect and extract metadata "Label: value" patterns that appear
 * mid-sentence. Example: "... बाबत। सेवा में, संचालक ... आवेदक: (पीटर बेक) ..."
 * We want "आवेदक" on its own and "(पीटर बेक) राजहर्ष..." as its value.
 */
const splitMetadataInline = (text: string): string => {
  let result = text;

  METADATA_LABELS.forEach((label) => {
    // Match " label:" followed by anything up to the next label or end
    // Uses a lazy match
    const pattern = new RegExp(`\\s(${label})\\s*:\\s*`, 'g');
    result = result.replace(pattern, `\n$1: `);
  });

  return result;
};

/**
 * Bullet line detection.
 */
const isBulletLine = (line: string): boolean =>
  /^\s*[•▪●○\-\u2022]\s+/.test(line);

/**
 * Numbered line: starts with "1." or "10." followed by whitespace.
 */
const isNumberedLine = (line: string): boolean => /^\s*\d{1,2}\.\s+/.test(line);

/**
 * Section header: numbered line, and we treat it as a header if:
 *   - ends with `:`, OR
 *   - the next non-empty line is a bullet
 * This second rule is applied post-parse.
 */
const isSectionHeaderByColon = (line: string): boolean =>
  isNumberedLine(line) && /:\s*$/.test(line.trim());

/**
 * Metadata line: "label: value" where label matches our known list.
 */
const parseMetadata = (
  line: string
): { label: string; value: string } | null => {
  const trimmed = line.trim();
  if (!trimmed || isNumberedLine(trimmed)) return null;

  const match = trimmed.match(/^([^:]{1,50}?):\s*(.+)$/);
  if (!match) return null;

  const label = match[1].trim();
  const value = match[2].trim();
  if (!value) return null;

  return { label, value };
};

// ---------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------
const parseDescription = (description: string): Block[] => {
  if (!description) return [];

  // Pre-process: reinsert structure that the source format stripped
  let prepared = description.replace(/\r?\n/g, ' '); // flatten first
  prepared = splitMetadataInline(prepared);
  prepared = insertStructuralBreaks(prepared);

  const lines = prepared.split(/\n/);
  const blocks: Block[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1) Section header (numbered + trailing colon)
    if (isSectionHeaderByColon(line)) {
      const m = line.match(/^(\d{1,2})\.\s*(.*)$/);
      if (m) {
        blocks.push({
          kind: 'section-header',
          number: m[1],
          text: m[2].trim().replace(/:$/, ''), // drop the trailing colon
        });
        continue;
      }
    }

    // 2) Bullet
    if (isBulletLine(line)) {
      blocks.push({
        kind: 'bullet',
        text: line.replace(/^\s*[•▪●○\-\u2022]\s+/, '').trim(),
      });
      continue;
    }

    // 3) Numbered item
    if (isNumberedLine(line)) {
      const m = line.match(/^(\d{1,2})\.\s*(.*)$/);
      if (m) {
        blocks.push({
          kind: 'numbered',
          number: m[1],
          text: m[2].trim(),
        });
        continue;
      }
    }

    // 4) Metadata
    const meta = parseMetadata(line);
    if (meta) {
      blocks.push({ kind: 'metadata', ...meta });
      continue;
    }

    // 5) Paragraph
    blocks.push({ kind: 'paragraph', text: line });
  }

  // Post-process: a numbered item followed by a bullet is actually a header
  for (let i = 0; i < blocks.length - 1; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (b.kind === 'numbered' && next.kind === 'bullet') {
      blocks[i] = {
        kind: 'section-header',
        number: b.number,
        text: b.text.replace(/:$/, ''),
      };
    }
  }

  return blocks;
};

// ---------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------

const MetadataRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex flex-wrap gap-x-2 text-sm">
    <span className="font-semibold text-gray-700 shrink-0">{label}:</span>
    <span className="text-gray-800 break-words flex-1 min-w-0">{value}</span>
  </div>
);

const SectionHeader: React.FC<{ number: string; text: string }> = ({
  number,
  text,
}) => (
  <div className="flex items-start gap-2 pt-3">
    <span className="font-bold text-gray-900 shrink-0">{number}.</span>
    <span className="font-bold text-gray-900 break-words">{text}</span>
  </div>
);

const BulletItem: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-start gap-2 pl-4 text-sm">
    <span className="shrink-0 mt-[0.55em] w-1.5 h-1.5 rounded-full bg-gray-500" />
    <span className="text-gray-800 break-words flex-1 min-w-0">{text}</span>
  </li>
);

const NumberedItem: React.FC<{ number: string; text: string }> = ({
  number,
  text,
}) => (
  <li className="flex items-start gap-2 text-sm">
    <span className="shrink-0 font-semibold text-gray-700 w-5">
      {number}.
    </span>
    <span className="text-gray-800 break-words flex-1 min-w-0">{text}</span>
  </li>
);

const Paragraph: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm text-gray-800 break-words">{text}</p>
);

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------
export const DescriptionRenderer: React.FC<DescriptionRendererProps> = ({
  description,
}) => {
  const blocks = useMemo(() => parseDescription(description), [description]);
  const isHindi = useMemo(() => containsHindi(description), [description]);

  const rendered = useMemo(() => {
    const out: React.ReactNode[] = [];
    let bulletBuffer: string[] = [];
    let numberedBuffer: { number: string; text: string }[] = [];

    const flushBullets = (key: string) => {
      if (bulletBuffer.length) {
        out.push(
          <ul key={key} className="space-y-1.5 ml-1">
            {bulletBuffer.map((b, i) => (
              <BulletItem key={i} text={b} />
            ))}
          </ul>
        );
        bulletBuffer = [];
      }
    };

    const flushNumbered = (key: string) => {
      if (numberedBuffer.length) {
        out.push(
          <ol key={key} className="space-y-1.5">
            {numberedBuffer.map((n, i) => (
              <NumberedItem key={i} number={n.number} text={n.text} />
            ))}
          </ol>
        );
        numberedBuffer = [];
      }
    };

    blocks.forEach((block, idx) => {
      if (block.kind !== 'bullet') flushBullets(`ul-${idx}`);
      if (block.kind !== 'numbered') flushNumbered(`ol-${idx}`);

      switch (block.kind) {
        case 'metadata':
          out.push(
            <MetadataRow
              key={`meta-${idx}`}
              label={block.label}
              value={block.value}
            />
          );
          break;
        case 'section-header':
          out.push(
            <SectionHeader
              key={`sec-${idx}`}
              number={block.number}
              text={block.text}
            />
          );
          break;
        case 'bullet':
          bulletBuffer.push(block.text);
          break;
        case 'numbered':
          numberedBuffer.push({ number: block.number, text: block.text });
          break;
        case 'paragraph':
          out.push(<Paragraph key={`p-${idx}`} text={block.text} />);
          break;
      }
    });

    flushBullets('ul-final');
    flushNumbered('ol-final');

    return out;
  }, [blocks]);

  if (!blocks.length) {
    return (
      <p className="text-sm text-gray-500 italic">No description available.</p>
    );
  }

  return (
    <div
      className={`space-y-2 ${isHindi ? 'font-hindi' : ''}`}
      style={{ lineHeight: isHindi ? 1.9 : 1.6 }}
    >
      {rendered}
    </div>
  );
};