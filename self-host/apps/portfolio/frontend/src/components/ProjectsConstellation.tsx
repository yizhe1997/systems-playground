'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Project } from '@/components/ProjectRow';
import { VARIANTS, formatUrl } from '@/components/ProjectRow';

type SimNode = {
  id: string;
  kind: 'project' | 'tag';
  label: string;
  project?: Project;
  variantIndex?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

type SimEdge = { source: string; target: string };

const W = 800;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const STEPS = 260;

// Hand-rolled force layout - no d3-force in this dependency tree, and none of
// matter-js/gsap/framer-motion/animejs (already deps) offer a multi-body
// force-simulation API. Runs a fixed number of steps then freezes rather
// than animating continuously - this is a decorative/exploratory secondary
// view, not a live physics toy, so nothing benefits from motion after the
// layout has visibly settled.
function runSimulation(nodes: SimNode[], edges: SimEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let step = 0; step < STEPS; step++) {
    for (const n1 of nodes) {
      let fx = 0;
      let fy = 0;
      for (const n2 of nodes) {
        if (n1 === n2) continue;
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const d = Math.max(20, Math.sqrt(dx * dx + dy * dy));
        const force = 900 / (d * d);
        fx += (dx / d) * force;
        fy += (dy / d) * force;
      }
      fx += (CX - n1.x) * 0.006;
      fy += (CY - n1.y) * 0.006;
      n1.vx = (n1.vx + fx) * 0.7;
      n1.vy = (n1.vy + fy) * 0.7;
    }
    for (const e of edges) {
      const na = byId.get(e.source);
      const nb = byId.get(e.target);
      if (!na || !nb) continue;
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d - 90) * 0.03;
      const ux = dx / d;
      const uy = dy / d;
      na.vx += ux * f;
      na.vy += uy * f;
      nb.vx -= ux * f;
      nb.vy -= uy * f;
    }
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(n.r + 40, Math.min(W - n.r - 40, n.x));
      n.y = Math.max(n.r + 16, Math.min(H - n.r - 16, n.y));
    }
  }
}

export default function ProjectsConstellation({ projects }: { projects: Project[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const highlightedRef = useRef<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const tagNames = Array.from(new Set(projects.flatMap((p) => p.tech_stack))).sort();

    const projectNodes: SimNode[] = projects.map((p, i) => {
      const a = (i / Math.max(1, projects.length)) * Math.PI * 2;
      return {
        id: `project:${p.id}`,
        kind: 'project',
        label: p.title || 'Untitled project',
        project: p,
        variantIndex: i % VARIANTS.length,
        x: CX + Math.cos(a) * 180,
        y: CY + Math.sin(a) * 130,
        vx: 0,
        vy: 0,
        r: 26,
      };
    });

    const tagNodes: SimNode[] = tagNames.map((t, i) => {
      const a = (i / Math.max(1, tagNames.length)) * Math.PI * 2;
      return {
        id: `tag:${t}`,
        kind: 'tag',
        label: t,
        x: CX + Math.cos(a) * 80,
        y: CY + Math.sin(a) * 60,
        vx: 0,
        vy: 0,
        r: 15,
      };
    });

    const allNodes = [...projectNodes, ...tagNodes];
    const allEdges: SimEdge[] = [];
    for (const p of projects) {
      for (const t of p.tech_stack) {
        allEdges.push({ source: `project:${p.id}`, target: `tag:${t}` });
      }
    }

    runSimulation(allNodes, allEdges);

    return { nodes: allNodes, edges: allEdges };
  }, [projects]);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  useEffect(() => {
    applyHighlight(svgRef.current, edges, null);
    highlightedRef.current = null;
  }, [nodes, edges]);

  const handleTagClick = (tagId: string) => {
    const next = highlightedRef.current === tagId ? null : tagId;
    highlightedRef.current = next;
    applyHighlight(svgRef.current, edges, next);
  };

  const handleProjectClick = (project: Project) => {
    if (!project.live_url) return;
    window.open(formatUrl(project.live_url), '_blank', 'noopener,noreferrer');
  };

  if (projects.length === 0) {
    return (
      <div className="border-2 border-black p-12 text-center" style={{ borderRadius: '0.75rem' }}>
        <p className="font-extrabold" style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-charcoal)' }}>
          Nothing here yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto border-2 border-black bg-white" style={{ borderRadius: '0.75rem' }}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {edges.map((e, i) => {
            const na = nodesById.get(e.source);
            const nb = nodesById.get(e.target);
            if (!na || !nb) return null;
            return (
              <line
                key={i}
                data-edge-a={e.source}
                data-edge-b={e.target}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="var(--ds-black)"
                strokeWidth={1.5}
                style={{ opacity: 0.25, transition: 'opacity 150ms' }}
              />
            );
          })}
          {nodes.map((n) => {
            if (n.kind === 'tag') {
              return (
                <g
                  key={n.id}
                  data-node-id={n.id}
                  style={{ cursor: 'pointer', transition: 'opacity 150ms' }}
                  onClick={() => handleTagClick(n.id)}
                >
                  <circle cx={n.x} cy={n.y} r={n.r} fill="var(--ds-black)" stroke="var(--ds-black)" strokeWidth={2} />
                  <text
                    x={n.x}
                    y={n.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#ffffff"
                    style={{ fontFamily: 'var(--ds-font-body)', pointerEvents: 'none' }}
                  >
                    {n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}
                  </text>
                </g>
              );
            }

            const variant = VARIANTS[n.variantIndex ?? 0];
            const hasLive = Boolean(n.project?.live_url);
            return (
              <g
                key={n.id}
                data-node-id={n.id}
                style={{ cursor: hasLive ? 'pointer' : 'default', transition: 'opacity 150ms' }}
                onClick={() => n.project && handleProjectClick(n.project)}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={variant.bg}
                  stroke="var(--ds-black)"
                  strokeWidth={2}
                  strokeDasharray={hasLive ? undefined : '4 3'}
                />
                <text
                  x={n.x}
                  y={n.y + n.r + 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  fill="var(--ds-charcoal)"
                  style={{ fontFamily: 'var(--ds-font-display)', pointerEvents: 'none' }}
                >
                  {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sm:hidden text-xs text-[var(--ds-charcoal)]/55 mt-2">Scroll to explore &rarr;</p>
    </div>
  );
}

function applyHighlight(svg: SVGSVGElement | null, edges: SimEdge[], highlighted: string | null) {
  if (!svg) return;

  const connected = new Set<string>();
  if (highlighted) {
    connected.add(highlighted);
    for (const e of edges) {
      if (e.source === highlighted) connected.add(e.target);
      if (e.target === highlighted) connected.add(e.source);
    }
  }

  svg.querySelectorAll<SVGGElement>('g[data-node-id]').forEach((el) => {
    const id = el.getAttribute('data-node-id')!;
    const on = !highlighted || connected.has(id);
    el.style.opacity = on ? '1' : '0.15';
  });

  svg.querySelectorAll<SVGLineElement>('line[data-edge-a]').forEach((el) => {
    const a = el.getAttribute('data-edge-a')!;
    const b = el.getAttribute('data-edge-b')!;
    const on = !highlighted || a === highlighted || b === highlighted;
    el.style.opacity = highlighted ? (on ? '1' : '0.08') : '0.25';
  });
}
