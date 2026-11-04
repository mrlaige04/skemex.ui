import type { ElementDefinition, LayoutOptions, StylesheetStyle } from 'cytoscape';
import type {
  ProjectTaskGraphDto,
  ProjectTaskGraphEdgeDto,
} from '../../models/projects/projects.models';

export type TaskGraphEdgeFilter = 'all' | 'hierarchy' | 'relations';

export function buildCytoElements(
  graph: ProjectTaskGraphDto,
  filter: TaskGraphEdgeFilter,
): ElementDefinition[] {
  const visibleEdges = graph.edges.filter((edge) => includeEdge(edge, filter));

  const nodes: ElementDefinition[] = graph.nodes.map((node) => ({
    group: 'nodes',
    data: {
      id: node.id,
      code: node.code,
      label: `${node.code}\n${truncate(node.title, 40)}`,
      title: node.title,
      type: node.type || 'Task',
      columnTitle: node.columnTitle,
    },
  }));

  const edges: ElementDefinition[] = visibleEdges.map((edge) => ({
    group: 'edges',
    data: {
      id: edge.id,
      source: edge.sourceTaskId,
      target: edge.targetTaskId,
      kind: edge.kind,
      label: edgeLabel(edge.kind),
    },
  }));

  return [...nodes, ...edges];
}

export function cytoStylesheet(): StylesheetStyle[] {
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-family': "Outfit, ui-sans-serif, system-ui, sans-serif",
        'font-size': 12,
        color: '#0f172a',
        'background-color': '#eff6ff',
        'border-width': 2,
        'border-color': '#3b82f6',
        shape: 'round-rectangle',
        width: 'label',
        height: 'label',
        padding: '14px',
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node[type = "Feature"]',
      style: {
        'background-color': '#f5f3ff',
        'border-color': '#8b5cf6',
      },
    },
    {
      selector: 'node[type = "Bug"]',
      style: {
        'background-color': '#fef2f2',
        'border-color': '#ef4444',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#0f172a',
      },
    },
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0.08,
        'overlay-color': '#0f172a',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        label: 'data(label)',
        'font-size': 10,
        'font-family': "Outfit, ui-sans-serif, system-ui, sans-serif",
        color: '#64748b',
        'text-rotation': 'autorotate',
        'text-margin-y': -8,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
      },
    },
    {
      selector: 'edge[kind = "ParentOf"]',
      style: {
        'line-style': 'dashed',
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 20,
      },
    },
    {
      selector: 'edge[kind = "BlockedBy"]',
      style: {
        width: 2.5,
        'line-color': '#ea580c',
        'target-arrow-color': '#ea580c',
      },
    },
    {
      selector: 'edge[kind = "RelatesTo"]',
      style: {
        'line-color': '#0d9488',
        'target-arrow-color': '#0d9488',
      },
    },
    {
      selector: 'edge[kind = "Duplicates"]',
      style: {
        'line-color': '#9333ea',
        'target-arrow-color': '#9333ea',
      },
    },
  ];
}

export function cytoLayout(filter: TaskGraphEdgeFilter): LayoutOptions {
  if (filter === 'relations') {
    return {
      name: 'cose',
      animate: false,
      randomize: true,
      componentSpacing: 80,
      nodeRepulsion: () => 6500,
      idealEdgeLength: () => 120,
      edgeElasticity: () => 90,
      nestingFactor: 1.2,
      gravity: 0.25,
      numIter: 900,
      initialTemp: 180,
      coolingFactor: 0.95,
      minTemp: 1,
    };
  }

  // Built-in hierarchical layout (no extra plugins).
  return {
    name: 'breadthfirst',
    directed: true,
    padding: 40,
    spacingFactor: 1.35,
    avoidOverlap: true,
    animate: false,
    // Prefer ParentOf edges for tree roots/levels when mixed with relations.
    roots: undefined,
  };
}

export function parentRoots(edges: ProjectTaskGraphEdgeDto[]): string[] | undefined {
  const parentEdges = edges.filter((e) => e.kind === 'ParentOf');
  if (parentEdges.length === 0) {
    return undefined;
  }
  const children = new Set(parentEdges.map((e) => e.targetTaskId));
  const roots = new Set(
    parentEdges.map((e) => e.sourceTaskId).filter((id) => !children.has(id)),
  );
  return roots.size > 0 ? [...roots] : undefined;
}

function includeEdge(edge: ProjectTaskGraphEdgeDto, filter: TaskGraphEdgeFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'hierarchy') {
    return edge.kind === 'ParentOf';
  }
  return edge.kind !== 'ParentOf';
}

function edgeLabel(kind: string): string {
  switch (kind) {
    case 'ParentOf':
      return 'parent';
    case 'BlockedBy':
      return 'blocked by';
    case 'RelatesTo':
      return 'relates';
    case 'Duplicates':
      return 'duplicates';
    default:
      return kind;
  }
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}
