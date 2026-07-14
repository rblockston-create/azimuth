import { icons } from './icons.jsx';

const TOOLS = [
  ['pen', 'Pen', 'P'],
  ['line', 'Line', 'L'],
  ['arrow', 'Arrow', 'A'],
  ['rect', 'Rectangle', 'R'],
  ['ellipse', 'Ellipse', 'O'],
  ['text', 'Text', 'T'],
  ['eraser', 'Eraser', 'E'],
];

// Ink colors, not UI colors — they sit on chart paper.
export const INKS = ['#16202a', '#b0544c', '#2f6d8f', '#5c8a4e', '#a06a2c'];
export const WIDTHS = [2, 4, 8];

export default function Toolbar({ tool, setTool, color, setColor, width, setWidth, onClear, canClear }) {
  return (
    <div className="tools">
      {TOOLS.map(([id, label, key]) => (
        <button
          key={id}
          className="tool"
          aria-pressed={tool === id}
          title={`${label} (${key})`}
          onClick={() => setTool(id)}
        >
          {icons[id]}
        </button>
      ))}

      <div className="tool-sep" />

      <div className="swatches">
        {INKS.map((ink) => (
          <button
            key={ink}
            className="swatch"
            aria-pressed={color === ink}
            title={`Ink ${ink}`}
            style={{ background: ink }}
            onClick={() => setColor(ink)}
          />
        ))}
      </div>

      <div className="widths">
        {WIDTHS.map((w) => (
          <button
            key={w}
            className="width-btn"
            aria-pressed={width === w}
            title={`Stroke ${w}px`}
            onClick={() => setWidth(w)}
          >
            <span style={{ height: Math.min(w, 6) }} />
          </button>
        ))}
      </div>

      {canClear && (
        <>
          <div className="tool-sep" />
          <button className="tool" title="Clear board" onClick={onClear}>
            {icons.trash}
          </button>
        </>
      )}
    </div>
  );
}
