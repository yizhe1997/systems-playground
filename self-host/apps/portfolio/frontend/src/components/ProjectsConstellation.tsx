'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Project } from '@/components/ProjectRow';
import { formatUrl } from '@/components/ProjectRow';

type SimNode = SimulationNodeDatum & {
  id: string;
  kind: 'project' | 'tag';
  label: string;
  project?: Project;
  r: number;
};

type SimEdge = SimulationLinkDatum<SimNode>;

const W = 800;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export type ProjectsConstellationHandle = { resetView: () => void };

const ProjectsConstellation = forwardRef<ProjectsConstellationHandle, { projects: Project[] }>(function ProjectsConstellation(
  { projects },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const highlightedRef = useRef<string | null>(null);
  const simRef = useRef<Simulation<SimNode, SimEdge> | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  // Pan/zoom lives outside React state - like onTick's DOM writes, this can fire on every wheel
  // tick or pointermove and would be far too chatty to route through re-renders.
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const panRef = useRef<{ startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);

  const applyViewTransform = () => {
    const { x, y, k } = viewRef.current;
    viewportRef.current?.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
  };

  const resetView = () => {
    viewRef.current = { x: 0, y: 0, k: 1 };
    applyViewTransform();
  };

  useImperativeHandle(ref, () => ({ resetView }));

  const { nodes, edges } = useMemo(() => {
    const tagNames = Array.from(new Set(projects.flatMap((p) => p.tech_stack))).sort();

    const projectNodes: SimNode[] = projects.map((p, i) => {
      const a = (i / Math.max(1, projects.length)) * Math.PI * 2;
      return {
        id: `project:${p.id}`,
        kind: 'project',
        label: p.title || 'Untitled project',
        project: p,
        x: CX + Math.cos(a) * 180,
        y: CY + Math.sin(a) * 130,
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

    return { nodes: allNodes, edges: allEdges };
  }, [projects]);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Real, continuous force simulation (d3-force) instead of a one-shot layout - runs hot on
  // mount/whenever the project list changes (visibly relaxing into place), then naturally cools
  // via alpha decay to idle within a couple of seconds. No perpetual requestAnimationFrame loop
  // burning CPU once settled - "reheats" only when a drag starts (see handlePointerDown).
  useEffect(() => {
    const sim = forceSimulation<SimNode>(nodes)
      .force('charge', forceManyBody().strength(-220))
      .force(
        'link',
        forceLink<SimNode, SimEdge>(edges)
          .id((d) => d.id)
          .distance(90)
      )
      .force('center', forceCenter(CX, CY))
      .force(
        'collide',
        forceCollide<SimNode>((d) => d.r + 4)
      )
      .on('tick', onTick);

    simRef.current = sim;
    applyHighlight(svgRef.current, edges, null);
    highlightedRef.current = null;

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Wheel-to-zoom, centered on the cursor - a native, non-passive listener rather than React's
  // onWheel, since React delegates wheel listeners at the root as passive for scroll performance,
  // which would silently make e.preventDefault() here a no-op and let the page scroll underneath.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pt = toSvgPoint(svg, e.clientX, e.clientY);
      const { x, y, k } = viewRef.current;
      const factor = Math.exp(-e.deltaY * 0.001);
      const nextK = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k * factor));
      if (nextK === k) return;
      viewRef.current = {
        k: nextK,
        x: pt.x - (nextK / k) * (pt.x - x),
        y: pt.y - (nextK / k) * (pt.y - y),
      };
      applyViewTransform();
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTick() {
    const svg = svgRef.current;
    if (!svg) return;
    for (const n of nodes) {
      const el = svg.querySelector<SVGGElement>(`g[data-node-id="${cssEscape(n.id)}"]`);
      if (el && n.x != null && n.y != null) el.setAttribute('transform', `translate(${n.x},${n.y})`);
    }
    for (const e of edges) {
      const source = nodesById.get(edgeNodeId(e.source));
      const target = nodesById.get(edgeNodeId(e.target));
      if (!source || !target) continue;
      const el = svg.querySelector<SVGLineElement>(
        `line[data-edge-a="${cssEscape(source.id)}"][data-edge-b="${cssEscape(target.id)}"]`
      );
      if (el && source.x != null && source.y != null && target.x != null && target.y != null) {
        el.setAttribute('x1', String(source.x));
        el.setAttribute('y1', String(source.y));
        el.setAttribute('x2', String(target.x));
        el.setAttribute('y2', String(target.y));
      }
    }
  }

  const handleTagClick = (tagId: string) => {
    const next = highlightedRef.current === tagId ? null : tagId;
    highlightedRef.current = next;
    applyHighlight(svgRef.current, edges, next);
  };

  const handleProjectClick = (project: Project) => {
    if (!project.live_url) return;
    window.open(formatUrl(project.live_url), '_blank', 'noopener,noreferrer');
  };

  const handlePointerDown = (n: SimNode, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation(); // don't let this bubble into the background pan handler on the <svg>
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: n.id, moved: false };
    simRef.current?.alphaTarget(0.3).restart();
    n.fx = n.x;
    n.fy = n.y;
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;
    const n = nodesById.get(drag.id);
    if (!n) return;
    // toSvgPoint gives a point in the <svg>'s own (unzoomed/unpanned) viewBox space - invert the
    // viewport <g>'s current pan/zoom to land back in the simulation's coordinate space, which is
    // what fx/fy are pinned in regardless of how the view is currently scrolled/zoomed.
    const pt = toSvgPoint(svg, e.clientX, e.clientY);
    const { x, y, k } = viewRef.current;
    n.fx = (pt.x - x) / k;
    n.fy = (pt.y - y) / k;
    drag.moved = true;
  };

  const handlePointerUp = (n: SimNode, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    const drag = dragRef.current;
    dragRef.current = null;
    n.fx = null;
    n.fy = null;
    simRef.current?.alphaTarget(0);
    if (drag && !drag.moved) {
      if (n.kind === 'tag') handleTagClick(n.id);
      else if (n.project) handleProjectClick(n.project);
    }
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-node-id]')) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const pt = toSvgPoint(svg, e.clientX, e.clientY);
    panRef.current = {
      startClientX: pt.x,
      startClientY: pt.y,
      startX: viewRef.current.x,
      startY: viewRef.current.y,
    };
  };

  const handleBackgroundPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!pan || !svg) return;
    const pt = toSvgPoint(svg, e.clientX, e.clientY);
    viewRef.current = {
      ...viewRef.current,
      x: pan.startX + (pt.x - pan.startClientX),
      y: pan.startY + (pt.y - pan.startClientY),
    };
    applyViewTransform();
  };

  const handleBackgroundPointerUp = () => {
    panRef.current = null;
  };

  if (projects.length === 0) {
    return (
      <div className="border-2 border-black p-12 text-center bg-[var(--ds-charcoal)]" style={{ borderRadius: '0.75rem' }}>
        <p className="font-extrabold text-white" style={{ fontFamily: 'var(--ds-font-display)' }}>
          Nothing here yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative w-full border-2 border-black bg-[var(--ds-charcoal)]" style={{ borderRadius: '0.75rem' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', touchAction: 'none', cursor: 'grab', borderRadius: '0.75rem' }}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerUp}
        >
          <g ref={viewportRef}>
            {edges.map((e, i) => {
              // e.source/e.target start as plain id strings and only get resolved into real
              // SimNode object references once forceLink initializes inside the effect below - on
              // this very first render (before that effect has run) they're still strings, so
              // resolve via nodesById rather than assuming the object shape either way.
              const source = nodesById.get(edgeNodeId(e.source));
              const target = nodesById.get(edgeNodeId(e.target));
              if (!source || !target) return null;
              return (
                <line
                  key={i}
                  data-edge-a={source.id}
                  data-edge-b={target.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  style={{ opacity: 0.2, transition: 'opacity 150ms' }}
                />
              );
            })}
            {nodes.map((n) => {
              if (n.kind === 'tag') {
                return (
                  <g
                    key={n.id}
                    data-node-id={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: 'pointer', transition: 'opacity 150ms', touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(n, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(n, e)}
                  >
                    <circle cx={0} cy={0} r={n.r} fill="var(--ds-sage)" stroke="var(--ds-black)" strokeWidth={2} />
                    <text
                      x={0}
                      y={n.r + 14}
                      textAnchor="middle"
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

              const hasLive = Boolean(n.project?.live_url);
              return (
                <g
                  key={n.id}
                  data-node-id={n.id}
                  data-cursor-label={hasLive ? 'Visit' : undefined}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: hasLive ? 'pointer' : 'default', transition: 'opacity 150ms', touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(n, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(n, e)}
                >
                  <circle cx={0} cy={0} r={n.r} fill="var(--ds-yellow)" stroke="var(--ds-black)" strokeWidth={2} />
                  <text
                    x={0}
                    y={n.r + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={800}
                    fill="#ffffff"
                    style={{ fontFamily: 'var(--ds-font-display)', pointerEvents: 'none' }}
                  >
                    {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <ul className="list-disc list-outside pl-4 text-xs text-[var(--ds-charcoal)]/55 mt-2 space-y-0.5">
        <li>Scroll to zoom</li>
        <li>Drag to pan</li>
        <li>Drag a node to move it</li>
      </ul>
    </div>
  );
});

export default ProjectsConstellation;

// Node ids are user-controlled tag text / project ids - escape before interpolating into a CSS
// attribute selector so a tag containing a quote or backslash can't break the selector.
function cssEscape(id: string) {
  return id.replace(/["\\]/g, '\\$&');
}

// d3-force's forceLink mutates edge.source/edge.target in place from plain id strings into real
// SimNode object references once it initializes - safe to read either shape at any point. The
// numeric-index case in SimulationLinkDatum's type is a d3-force generality this component never
// actually produces (edges here are always built with string ids), included only to satisfy it.
function edgeNodeId(x: string | number | SimNode): string {
  return typeof x === 'object' ? x.id : String(x);
}

function applyHighlight(svg: SVGSVGElement | null, edges: SimEdge[], highlighted: string | null) {
  if (!svg) return;

  const connected = new Set<string>();
  if (highlighted) {
    connected.add(highlighted);
    for (const e of edges) {
      const sourceId = edgeNodeId(e.source);
      const targetId = edgeNodeId(e.target);
      if (sourceId === highlighted) connected.add(targetId);
      if (targetId === highlighted) connected.add(sourceId);
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
