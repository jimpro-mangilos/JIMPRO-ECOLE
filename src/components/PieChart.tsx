import { useState } from 'react';

export interface PieChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartDataItem[];
  title?: string;
  size?: number;
}

export function PieChart({ data, title, size = 160 }: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data.length || total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Aucune donnee
      </div>
    );
  }

  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;

  const segments: { path: string; color: string; midAngle: number; index: number }[] = [];
  let currentAngle = -Math.PI / 2;

  data.forEach((item, i) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const path =
      data.length === 1
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    segments.push({ path, color: item.color, midAngle, index: i });
    currentAngle = endAngle;
  });

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      )}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="select-none">
            {segments.map((seg) => {
              const isHovered = hoveredIndex === seg.index;
              const offset = isHovered ? 4 : 0;
              const tx = offset * Math.cos(seg.midAngle);
              const ty = offset * Math.sin(seg.midAngle);

              return (
                <path
                  key={seg.index}
                  d={seg.path}
                  fill={seg.color}
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.5}
                  transform={`translate(${tx}, ${ty})`}
                  onMouseEnter={() => setHoveredIndex(seg.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-200"
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
            {hoveredItem && (
              <g>
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1f2937"
                >
                  {((hoveredItem.value / total) * 100).toFixed(1)}%
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {hoveredItem.value.toLocaleString('fr-FR')} FC
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          {data.map((item, i) => {
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div
                key={i}
                className={`flex items-center gap-2 transition-opacity duration-200 ${
                  hoveredIndex !== null && hoveredIndex !== i ? 'opacity-40' : ''
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-700 truncate">{item.label}</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
