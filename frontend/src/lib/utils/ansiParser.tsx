export interface AnsiSegment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
}

const ansiColors: { [key: string]: string } = {
  '30': '#000000', '31': '#ff5555', '32': '#50fa7b', '33': '#f1fa8c',
  '34': '#bd93f9', '35': '#ff79c6', '36': '#8be9fd', '37': '#f8f8f2',
  '90': '#6272a4', '91': '#ff6e6e', '92': '#69ff94', '93': '#ffffa5',
  '94': '#d6acff', '95': '#ff92df', '96': '#a4ffff', '97': '#ffffff',
};

const ansiBgColors: { [key: string]: string } = {
  '40': '#000000', '41': '#ff5555', '42': '#50fa7b', '43': '#f1fa8c',
  '44': '#bd93f9', '45': '#ff79c6', '46': '#8be9fd', '47': '#f8f8f2',
  '100': '#6272a4', '101': '#ff6e6e', '102': '#69ff94', '103': '#ffffa5',
  '104': '#d6acff', '105': '#ff92df', '106': '#a4ffff', '107': '#ffffff',
};

export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  
  let lastIndex = 0;
  let currentStyle = {
    color: undefined as string | undefined,
    bgColor: undefined as string | undefined,
    bold: false,
    dim: false,
  };

  let match;
  while ((match = ansiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent) {
        segments.push({
          text: textContent,
          ...currentStyle,
        });
      }
    }

    const codes = match[1].split(';');
    for (const code of codes) {
      if (code === '0' || code === '') {
        currentStyle = { color: undefined, bgColor: undefined, bold: false, dim: false };
      } else if (code === '1') {
        currentStyle.bold = true;
      } else if (code === '2') {
        currentStyle.dim = true;
      } else if (ansiColors[code]) {
        currentStyle.color = ansiColors[code];
      } else if (ansiBgColors[code]) {
        currentStyle.bgColor = ansiBgColors[code];
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      ...currentStyle,
    });
  }

  return segments;
}

export function AnsiText({ text }: { text: string }) {
  const segments = parseAnsi(text);

  return (
    <>
      {segments.map((seg, i) => {
        const style: React.CSSProperties = {};
        if (seg.color) style.color = seg.color;
        if (seg.bgColor) style.backgroundColor = seg.bgColor;
        if (seg.bold) style.fontWeight = 'bold';
        if (seg.dim) style.opacity = 0.6;

        return Object.keys(style).length > 0 ? (
          <span key={i} style={style}>
            {seg.text}
          </span>
        ) : (
          seg.text
        );
      })}
    </>
  );
}

