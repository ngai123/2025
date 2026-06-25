import React from 'react';

const SpiderChart = ({ scores, size = 300 }) => {
    const traits = [
        { key: 'emotional_awareness', label: 'Emotional\nAwareness' },
        { key: 'vulnerability', label: 'Vulnerability' },
        { key: 'independence', label: 'Independence' },
        { key: 'empathy', label: 'Empathy' },
        { key: 'communication', label: 'Communication' },
        { key: 'trust', label: 'Trust' }
    ];

    const center = size / 2;
    const radius = size * 0.35;
    const levels = 5; // Number of concentric rings

    // Calculate point position for a given trait index and value (1-10)
    const getPoint = (index, value) => {
        const angle = (Math.PI * 2 * index) / traits.length - Math.PI / 2;
        const distance = (value / 10) * radius;
        return {
            x: center + distance * Math.cos(angle),
            y: center + distance * Math.sin(angle)
        };
    };

    // Generate grid lines
    const gridLines = [];
    for (let level = 1; level <= levels; level++) {
        const points = traits.map((_, i) => {
            const point = getPoint(i, (level / levels) * 10);
            return `${point.x},${point.y}`;
        }).join(' ');
        gridLines.push(
            <polygon
                key={`grid-${level}`}
                points={points}
                fill="none"
                stroke="rgba(255, 127, 127, 0.2)"
                strokeWidth="1"
            />
        );
    }

    // Generate axis lines
    const axisLines = traits.map((_, i) => {
        const point = getPoint(i, 10);
        return (
            <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={point.x}
                y2={point.y}
                stroke="rgba(255, 127, 127, 0.3)"
                strokeWidth="1"
            />
        );
    });

    // Generate data polygon
    const dataPoints = traits.map((trait, i) => {
        const value = scores[trait.key] || 5;
        const point = getPoint(i, value);
        return `${point.x},${point.y}`;
    }).join(' ');

    // Generate labels
    const labels = traits.map((trait, i) => {
        const point = getPoint(i, 12); // Place labels outside the chart
        const lines = trait.label.split('\n');
        return (
            <text
                key={`label-${i}`}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#5C5B52"
                fontSize="11"
                fontWeight="600"
                fontFamily="Poppins, sans-serif"
            >
                {lines.map((line, lineIndex) => (
                    <tspan
                        key={lineIndex}
                        x={point.x}
                        dy={lineIndex === 0 ? 0 : 14}
                    >
                        {line}
                    </tspan>
                ))}
            </text>
        );
    });

    // Generate score dots
    const scoreDots = traits.map((trait, i) => {
        const value = scores[trait.key] || 5;
        const point = getPoint(i, value);
        return (
            <circle
                key={`dot-${i}`}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#FF7F7F"
                stroke="white"
                strokeWidth="2"
            />
        );
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px'
        }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ overflow: 'visible' }}
            >
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="rgba(255, 255, 255, 0.1)"
                />

                {/* Grid lines */}
                {gridLines}

                {/* Axis lines */}
                {axisLines}

                {/* Data polygon */}
                <polygon
                    points={dataPoints}
                    fill="rgba(255, 127, 127, 0.3)"
                    stroke="#FF7F7F"
                    strokeWidth="2"
                />

                {/* Score dots */}
                {scoreDots}

                {/* Labels */}
                {labels}
            </svg>

            {/* Score legend */}
            <div style={{
                marginTop: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                width: '100%',
                maxWidth: '350px'
            }}>
                {traits.map((trait) => (
                    <div
                        key={trait.key}
                        style={{
                            textAlign: 'center',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '10px',
                            fontSize: '12px'
                        }}
                    >
                        <div style={{
                            color: '#FF7F7F',
                            fontWeight: '700',
                            fontSize: '18px'
                        }}>
                            {scores[trait.key] || 5}
                        </div>
                        <div style={{
                            color: '#5C5B52',
                            fontSize: '10px',
                            fontWeight: '500'
                        }}>
                            {trait.label.replace('\n', ' ')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpiderChart;
