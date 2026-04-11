type EquitySparklineProps = {
  data: number[];
};

export function EquitySparkline({ data }: EquitySparklineProps) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 100;
  const height = 100;
  const padding = 5;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Area fill path (close the path to create fill)
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="sparkline-container w-full" style={{ height: '80px' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D4B896" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D4B896" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={areaD}
          fill="url(#sparklineGradient)"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#D4B896"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* End point dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2"
          fill="#D4B896"
        />
      </svg>
    </div>
  );
}
