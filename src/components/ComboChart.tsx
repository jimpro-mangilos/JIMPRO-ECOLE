import { useState } from 'react';

export interface ComboChartDataItem {
  label: string;
  barValue: number;
  lineValue: number;
}

interface ComboChartProps {
  data: ComboChartDataItem[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  barColor?: string;
  lineColor?: string;
  barLabel?: string;
  lineLabel?: string;
}

export function ComboChart({
  data,
  title,
  height = 220,
  formatValue = (v) => v.toLocaleString('fr-FR'),
  barColor = '#10b981',
  lineColor = '#ef4444',
  barLabel = 'Recettes',
  lineLabel = 'Depenses',
}: ComboChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Aucune donnee disponible
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.barValue, d.lineValue)), 1);
  const padding = { top: 32, right: 16, bottom: 44, left: 16 };
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = 28;
  const gap = 20;
  const totalWidth = Math.max(data.length * (barWidth + gap) + padding.left + padding.right, 280);
  const gridLines = 4;

  const getBarX = (i: number) => padding.left + gap / 2 + i * (barWidth + gap);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;

  const linePoints = data
    .map((item, i) => {
      const x = getBarX(i) + barWidth / 2;
      const y = getY(item.lineValue);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        </div>
      )}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColor }} />
          <span className="text-xs text-gray-600">{barLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: lineColor, height: 3 }} />
          <span className="text-xs text-gray-600">{lineLabel}</span>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${totalWidth} ${height}`}
          preserveAspectRatio="xMinYMid meet"
          className="select-none"
        >
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padding.top + (chartHeight / gridLines) * i;
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={totalWidth - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray={i === gridLines ? '0' : '4 3'}
              />
            );
          })}

          {data.map((item, i) => {
            const x = getBarX(i);
            const barH = maxValue > 0 ? (item.barValue / maxValue) * chartHeight : 0;
            const y = padding.top + chartHeight - barH;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  ry={4}
                  fill={barColor}
                  opacity={isHovered ? 1 : 0.75}
                  className="transition-all duration-200"
                />
                {isHovered && (
                  <g>
                    <rect
                      x={x - 2}
                      y={y - 2}
                      width={barWidth + 4}
                      height={barH + 4}
                      rx={5}
                      fill="none"
                      stroke={barColor}
                      strokeWidth="1.5"
                      opacity={0.4}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill={barColor}
                    >
                      {formatValue(item.barValue)}
                    </text>
                  </g>
                )}
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                  fontWeight="500"
                >
                  {item.label.length > 7 ? item.label.slice(0, 6) + '.' : item.label}
                </text>
              </g>
            );
          })}

          <polyline
            points={linePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />

          {data.map((item, i) => {
            const cx = getBarX(i) + barWidth / 2;
            const cy = getY(item.lineValue);
            const isHovered = hoveredIndex === i;

            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3.5}
                  fill="white"
                  stroke={lineColor}
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                {isHovered && (
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill={lineColor}
                  >
                    {formatValue(item.lineValue)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
