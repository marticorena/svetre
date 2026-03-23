import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow, useNodesState, useEdgesState, addEdge, reconnectEdge,
  Background, Controls, MiniMap, useReactFlow, ReactFlowProvider
} from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useApolloClient, useQuery, useMutation, gql } from '@apollo/client';
import dagre from 'dagre';
import { HorseNode } from './HorseNode';
import { Sidebar } from './Sidebar';

function GroupNode({ data }: any) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -30, left: 10, fontWeight: 700, fontSize: '1.2em', color: '#555', letterSpacing: '-0.02em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12 }}>
        {data.label}
        {data.totalCount !== undefined && (
           <span style={{ fontSize: '0.7em', background: '#e5e5ea', padding: '4px 8px', borderRadius: 12, fontWeight: 600 }}>Total: {data.totalCount}</span>
        )}
      </div>
    </div>
  );
}

function RemovableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data, label }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div className="nodrag nopan" style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11, border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <strong>{label}</strong>
          {data?.onDelete && (
             <button onClick={(e) => { e.stopPropagation(); data.onDelete(id); }} style={{ background: 'transparent', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>&times;</button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { horse: HorseNode, group: GroupNode };
const edgeTypes = { removable: RemovableEdge };

const GET_HORSES = gql`
  query GetHorses { 
    horses { 
      id name sex status dateOfBirth 
      departmentId department { id name city } 
      sireId damId hasParents hasChildren parentCount childCount
      histories { departmentId startDate endDate department { name city } }
    } 
  }
`;

const GET_HORSE_RELATIVES = gql`
  query GetHorseRelatives($id: ID!) {
    horse(id: $id) {
      id sire { id name sex status dateOfBirth departmentId department { name city } hasParents hasChildren parentCount childCount histories { departmentId startDate endDate department { name city } } }
      dam { id name sex status dateOfBirth departmentId department { name city } hasParents hasChildren parentCount childCount histories { departmentId startDate endDate department { name city } } }
      sired { id name sex status dateOfBirth departmentId department { name city } hasParents hasChildren parentCount childCount histories { departmentId startDate endDate department { name city } } }
      damed { id name sex status dateOfBirth departmentId department { name city } hasParents hasChildren parentCount childCount histories { departmentId startDate endDate department { name city } } }
    }
  }
`;

const REPARENT_HORSE = gql`mutation ReparentHorse($childId: ID!, $parentId: ID!, $role: String!) { reparentHorse(childId: $childId, parentId: $parentId, role: $role) { id } }`;
const REMOVE_PARENT = gql`mutation RemoveParent($childId: ID!, $role: String!) { removeParent(childId: $childId, role: $role) { id } }`;
const MOVE_HORSE = gql`mutation MoveHorse($horseId: ID!, $departmentId: String!) { moveHorseDepartment(horseId: $horseId, departmentId: $departmentId) { id } }`;

const getLayoutedElements = (currentNodes: Node[], edges: Edge[], viewControls: any = {}, freshHorses: any[] = []) => {
  const mergedNodes = currentNodes.map(n => {
    if (n.type !== 'horse') return n;
    const fresh = freshHorses.find((h: any) => h.id === n.id);
    const horseData = fresh ? { ...n.data, ...fresh } : n.data;
    
    // Compute if we're showing all available parents/children based on edges, falling back to old logic if counts missing
    const pEdges = edges.filter(e => e.target === n.id && (e.label === 'Sire' || e.label === 'Dam')).length;
    const cEdges = edges.filter(e => e.source === n.id && e.label === 'Child').length;
    const pVis = horseData.parentCount !== undefined ? pEdges >= horseData.parentCount : pEdges > 0;
    const cVis = horseData.childCount !== undefined ? cEdges >= horseData.childCount : cEdges > 0;

    return { ...n, data: { ...horseData, parentsVisible: pVis, childrenVisible: cVis } };
  });

  if (viewControls.groupDepart || viewControls.groupCities) {
    const groupedNodes: Node[] = [];
    const horses = mergedNodes.filter(n => n.type === 'horse');
    const groupMap = new Map<string, Node[]>();
    
    horses.forEach(h => {
      let key = 'unassigned';
      if (viewControls.groupCities) key = h.data.department?.city || 'unassigned';
      else if (viewControls.groupDepart) key = h.data.departmentId || 'unassigned';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(h);
    });

    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;
    const groupCols = 3;

    const groupEntries = Array.from(groupMap.entries());
    
    // Filter if user focuses on just one, we could do:  
    // const focusDep = viewControls.focusGroupId;  if (focusDep) groupEntries = groupEntries.filter(...);

    groupEntries.forEach(([groupId, depHorses], groupIndex) => {
      let groupName = 'Unassigned Registry';
      if (groupId !== 'unassigned') groupName = viewControls.groupCities ? `${groupId} Command Area` : ((depHorses[0]?.data as any)?.department?.name || 'Department');

      const innerCols = Math.min(3, Math.max(1, depHorses.length));
      const innerRows = Math.ceil(depHorses.length / innerCols);
      const containerWidth = Math.max(400, 40 + (innerCols * 360));
      const containerHeight = Math.max(300, 80 + (innerRows * 200));

      if (groupIndex > 0 && groupIndex % groupCols === 0) {
         currentX = 0;
         currentY += rowMaxHeight + 40;
         rowMaxHeight = 0;
      }
      rowMaxHeight = Math.max(rowMaxHeight, containerHeight);

      const groupX = groupId !== 'unassigned' ? currentX : currentX;
      const groupY = groupId !== 'unassigned' ? currentY : currentY;

      if (groupId !== 'unassigned') {
        groupedNodes.push({
          id: groupId, type: 'group',
          data: { label: groupName, totalCount: depHorses.length }, position: { x: groupX, y: groupY },
          style: { width: containerWidth, height: containerHeight, backgroundColor: 'rgba(235, 240, 245, 0.4)', border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 16, zIndex: -1 },
        });
      }

      depHorses.forEach((h, i) => {
        const c = i % innerCols;
        const r = Math.floor(i / innerCols);
        const hx = 20 + (c * 350);
        const hy = 60 + (r * 200);
        groupedNodes.push({
          ...h,
          parentId: groupId !== 'unassigned' ? groupId : undefined,
          extent: groupId !== 'unassigned' ? 'parent' : undefined,
          position: groupId !== 'unassigned' ? { x: hx, y: hy } : { x: currentX + hx, y: currentY + hy },
        });
      });
      currentX += containerWidth + 40;
    });
    return { nodes: groupedNodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 140, nodesep: 80 });

  mergedNodes.filter(n => n.type === 'horse').forEach((node) => { dagreGraph.setNode(node.id, { width: 330, height: 170 }); });
  edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });
  dagre.layout(dagreGraph);

  const newNodes = mergedNodes.filter(n => n.type === 'horse').map((node) => {
    const np = dagreGraph.node(node.id);
    return { ...node, targetPosition: 'top', sourcePosition: 'bottom', position: { x: np.x - 165, y: np.y - 85 }, parentId: undefined, extent: undefined };
  });
  return { nodes: newNodes as Node[], edges };
};

function PedigreeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>({});
  const [viewControls, setViewControls] = useState({ groupDepart: false, groupCities: false, hideEdges: false });
  const [pendingMove, setPendingMove] = useState<{horseId: string, departmentId: string, label: string} | null>(null);
  const [lockedNodeId, setLockedNodeId] = useState<string | null>(null);

  const client = useApolloClient();
  const { data: horsesData, refetch } = useQuery(GET_HORSES);
  const [reparentHorseMut] = useMutation(REPARENT_HORSE);
  const [removeParentMut] = useMutation(REMOVE_PARENT);
  const [moveHorseMut] = useMutation(MOVE_HORSE);
  const { getNodes, getEdges, fitView, getIntersectingNodes } = useReactFlow();

  const handleToggleParents = async (id: string, isExpanded: boolean) => {
    // Legacy identical extraction tree logic
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const toggleState = (nodes: Node[]) => nodes.map(n => n.id === id ? { ...n, data: { ...n.data, parentsExpanded: !isExpanded } } : n);

    if (isExpanded) {
      let edgesToRemove = new Set<string>();
      const traverseUp = (currentId: string) => {
        const parentEdges = currentEdges.filter(e => e.target === currentId && (e.label === 'Sire' || e.label === 'Dam'));
        parentEdges.forEach(e => {
          const otherTargetEdges = currentEdges.filter(otherE => otherE.source === e.source && (otherE.label === 'Sire' || otherE.label === 'Dam') && otherE.target !== currentId);
          edgesToRemove.add(e.id);
          if (otherTargetEdges.length === 0) traverseUp(e.source);
        });
      };
      traverseUp(id);
      const newEdges = currentEdges.filter(e => !edgesToRemove.has(e.id));
      const newNodes = toggleState(currentNodes).filter(n => n.id === id || newEdges.some(e => e.source === n.id || e.target === n.id));

      const layouted = getLayoutedElements(newNodes.filter(n => n.type === 'horse'), newEdges, viewControls, horsesData?.horses || []);
      setNodes(layouted.nodes); setEdges(layouted.edges);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
      return;
    }

    const { data } = await client.query({ query: GET_HORSE_RELATIVES, variables: { id }, fetchPolicy: 'network-only' });
    if (!data?.horse) return;

    let newNodes = toggleState(currentNodes);
    let newEdges = [...currentEdges];

    const addParent = (parent: any, type: string) => {
      if (parent) {
        if (!newNodes.find(n => n.id === parent.id)) {
          newNodes.push({ id: parent.id, type: 'horse', data: { ...parent, onToggleParents: handleToggleParents, onToggleChildren: handleToggleChildren, parentsExpanded: false, childrenExpanded: false }, position: { x: 0, y: 0 } });
        }
        const edgeId = `e-${parent.id}-${id}`;
        if (!newEdges.find(e => e.id === edgeId)) newEdges.push({ id: edgeId, source: parent.id, target: id, label: type, type: 'removable' });
      }
    };
    addParent(data.horse.sire, 'Sire');
    addParent(data.horse.dam, 'Dam');

    const layouted = getLayoutedElements(newNodes.filter(n => n.type === 'horse'), newEdges, viewControls, horsesData?.horses || []);
    setNodes(layouted.nodes); setEdges(layouted.edges);
    
    // Smooth zoom centering
    const targetFocusId = lockedNodeId || id;
    fitView({ nodes: [{ id: targetFocusId }], duration: 500, maxZoom: 1 });
    setTimeout(() => {
      if (lockedNodeId) fitView({ nodes: [{ id: lockedNodeId }], duration: 800, padding: 0.8, maxZoom: 0.9 });
      else fitView({ duration: 800, padding: 0.2 });
    }, 550);
  };

  const handleToggleChildren = async (id: string, isExpanded: boolean) => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const toggleState = (nodes: Node[]) => nodes.map(n => n.id === id ? { ...n, data: { ...n.data, childrenExpanded: !isExpanded } } : n);

    if (isExpanded) {
      let edgesToRemove = new Set<string>();
      const traverseDown = (currentId: string) => {
        const childEdges = currentEdges.filter(e => e.source === currentId && e.label === 'Child');
        childEdges.forEach(e => {
          const otherParentEdges = currentEdges.filter(otherE => otherE.target === e.target && otherE.label === 'Child' && otherE.source !== currentId);
          edgesToRemove.add(e.id);
          if (otherParentEdges.length === 0) traverseDown(e.target);
        });
      };
      traverseDown(id);
      const newEdges = currentEdges.filter(e => !edgesToRemove.has(e.id));
      const newNodes = toggleState(currentNodes).filter(n => n.id === id || newEdges.some(e => e.source === n.id || e.target === n.id));

      const layouted = getLayoutedElements(newNodes.filter(n => n.type === 'horse'), newEdges, viewControls, horsesData?.horses || []);
      setNodes(layouted.nodes); setEdges(layouted.edges);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50);
      return;
    }

    const { data } = await client.query({ query: GET_HORSE_RELATIVES, variables: { id }, fetchPolicy: 'network-only' });
    if (!data?.horse) return;

    let newNodes = toggleState(currentNodes);
    let newEdges = [...currentEdges];

    const children = [...(data.horse.sired || []), ...(data.horse.damed || [])];
    children.forEach((child: any) => {
      if (child) {
        if (!newNodes.find(n => n.id === child.id)) {
          newNodes.push({ id: child.id, type: 'horse', data: { ...child, onToggleParents: handleToggleParents, onToggleChildren: handleToggleChildren, parentsExpanded: false, childrenExpanded: false }, position: { x: 0, y: 0 } });
        }
        const edgeId = `e-${id}-${child.id}`;
        if (!newEdges.find(e => e.id === edgeId)) newEdges.push({ id: edgeId, source: id, target: child.id, label: 'Child', type: 'removable' });
      }
    });

    const layouted = getLayoutedElements(newNodes.filter(n => n.type === 'horse'), newEdges, viewControls, horsesData?.horses || []);
    setNodes(layouted.nodes); setEdges(layouted.edges);
    
    // Smooth zoom centering
    const targetFocusId = lockedNodeId || id;
    fitView({ nodes: [{ id: targetFocusId }], duration: 500, maxZoom: 1 });
    setTimeout(() => {
       if (lockedNodeId) fitView({ nodes: [{ id: lockedNodeId }], duration: 800, padding: 0.8, maxZoom: 0.9 });
       else fitView({ duration: 800, padding: 0.2 });
    }, 550);
  };

  useEffect(() => {
    if (nodes.length > 0 && horsesData?.horses) {
      if (viewControls.groupDepart || viewControls.groupCities) {
         const layouted = getLayoutedElements(getNodes().filter(n => n.type === 'horse'), edges, viewControls, horsesData.horses);
         setNodes([...layouted.nodes]);
         setEdges([...layouted.edges]);
      } else {
         setNodes(nds => nds.map(n => {
            if (n.type !== 'horse') return n;
            const fresh = horsesData.horses.find((h:any) => h.id === n.id);
            return fresh ? { ...n, data: { ...n.data, ...fresh } } : n;
         }));
      }
    }
  }, [horsesData, viewControls.groupDepart, viewControls.groupCities]);

  useEffect(() => {
    if (horsesData?.horses?.length > 0 && nodes.length === 0) {
      const initialHorses = horsesData.horses.filter((h:any) => h.status !== 'deceased');
      const horsesToRender = initialHorses.length > 0 ? initialHorses : [horsesData.horses[0]];

      const initialNodes = horsesToRender.map((h: any) => ({
        id: h.id as string, type: 'horse',
        data: { ...h, onToggleParents: handleToggleParents, onToggleChildren: handleToggleChildren, lockedNodeId, setLockedNodeId },
        position: { x: 0, y: 0 },
      }));

      const initialEdges: Edge[] = [];
      const nodeIds = new Set(initialNodes.map((n:any) => n.id));
      
      horsesToRender.forEach((h: any) => {
        if (h.sireId && nodeIds.has(h.sireId)) initialEdges.push({ id: `e-${h.sireId}-${h.id}`, source: h.sireId, target: h.id, label: 'Sire', type: 'removable' });
        if (h.damId && nodeIds.has(h.damId)) initialEdges.push({ id: `e-${h.damId}-${h.id}`, source: h.damId, target: h.id, label: 'Dam', type: 'removable' });
      });

      const layouted = getLayoutedElements(initialNodes as Node[], initialEdges, viewControls, horsesData.horses);
      setNodes([...layouted.nodes]); setEdges([...layouted.edges]);
      setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 50);
    }
  }, [horsesData]); 

  const onConnect = useCallback(async (params: Connection | Edge) => {
    const parentNode = getNodes().find(n => n.id === params.source);
    if (!parentNode) return;
    const role = parentNode.data.sex === 'Male' ? 'Sire' : 'Dam';
    setEdges((eds) => addEdge({ ...params, label: 'Child', type: 'removable' }, eds));
    await reparentHorseMut({ variables: { childId: params.target, parentId: params.source, role } });
    refetch(); 
  }, [getNodes, setEdges, reparentHorseMut, refetch]);

  const onReconnect = useCallback(async (oldEdge: Edge, newConnection: Connection) => {
    const parentNode = getNodes().find(n => n.id === newConnection.source);
    if (!parentNode) return;
    const role = parentNode.data.sex === 'Male' ? 'Sire' : 'Dam';
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    await reparentHorseMut({ variables: { childId: newConnection.target, parentId: newConnection.source, role } });
    refetch();
  }, [getNodes, setEdges, reparentHorseMut, refetch]);

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      const parentNode = getNodes().find(n => n.id === edge.source);
      if (!parentNode) continue;
      const role = parentNode.data.sex === 'Male' ? 'Sire' : 'Dam';
      await removeParentMut({ variables: { childId: edge.target, role } });
    }
    refetch();
  }, [getNodes, removeParentMut, refetch]);

  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
    if (node.type !== 'horse') return;
    const intersections = getIntersectingNodes(node).filter(n => n.type === 'group');
    if (intersections.length > 0) {
      const targetGroup = intersections[0];
      if (viewControls.groupDepart && !viewControls.groupCities && node.data.departmentId !== targetGroup.id && targetGroup.id !== 'unassigned') {
        setPendingMove({ horseId: node.id, departmentId: targetGroup.id, label: targetGroup.data.label });
      }
    }
  }, [getIntersectingNodes, viewControls]);

  const onNodeJump = (h: any) => {
    const n = nodes.find(x => x.id === h.id);
    if (n) {
      fitView({ nodes: [{ id: h.id }], duration: 800, maxZoom: 1 });
    } else {
      const currentNodes = getNodes().filter(n => n.type === 'horse');
      const currentEdges = getEdges();
      const newNode = {
        id: h.id as string, type: 'horse',
        data: { ...h, onToggleParents: handleToggleParents, onToggleChildren: handleToggleChildren, lockedNodeId, setLockedNodeId },
        position: { x: 0, y: 0 },
      };
      const layouted = getLayoutedElements([...currentNodes, newNode], currentEdges, viewControls, horsesData?.horses || []);
      setNodes(layouted.nodes); setEdges(layouted.edges);
      setTimeout(() => fitView({ nodes: [{ id: h.id }], duration: 800, maxZoom: 1 }), 50);
    }
  };

  const visibleNodes = nodes.map(n => ({
    ...n,
    style: { ...n.style, opacity: (n.type === 'horse' && statusFilters[n.data.status] === false) ? 0.25 : 1, transition: 'opacity 0.2s' }
  }));

  const triggerResetLayout = () => {
    setViewControls({ groupDepart: false, groupCities: false, hideEdges: false });
    const horsesToRender = horsesData.horses.filter((h:any) => h.status !== 'deceased');
    const resetNodes = (horsesToRender.length > 0 ? horsesToRender : [horsesData.horses[0]]).map((h: any) => ({
      id: h.id as string, type: 'horse',
      data: { ...h, onToggleParents: handleToggleParents, onToggleChildren: handleToggleChildren, lockedNodeId, setLockedNodeId },
      position: { x: 0, y: 0 },
    }));
    const resetEdges: Edge[] = [];
    const nodeIds = new Set(resetNodes.map((n:any) => n.id));
    horsesToRender.forEach((h: any) => {
      if (h.sireId && nodeIds.has(h.sireId)) resetEdges.push({ id: `e-${h.sireId}-${h.id}`, source: h.sireId, target: h.id, label: 'Sire', type: 'removable' });
      if (h.damId && nodeIds.has(h.damId)) resetEdges.push({ id: `e-${h.damId}-${h.id}`, source: h.damId, target: h.id, label: 'Dam', type: 'removable' });
    });
    const layouted = getLayoutedElements(resetNodes as Node[], resetEdges, { groupDepart: false, groupCities: false, hideEdges: false }, horsesData.horses);
    setNodes([...layouted.nodes]); setEdges([...layouted.edges]);
    setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 50);
  };

  // Sync data whenever lockedNodeId changes so all nodes receive it
  useEffect(() => {
    setNodes(nds => nds.map(n => n.type === 'horse' ? { ...n, data: { ...(n.data as any), lockedNodeId, setLockedNodeId } } : n));
  }, [lockedNodeId]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f8f9fa' }}>
      <Sidebar horses={horsesData?.horses || []} refetch={refetch} onNodeJump={onNodeJump} statusFilters={statusFilters} setStatusFilters={setStatusFilters} viewControls={viewControls} setViewControls={setViewControls} triggerResetLayout={triggerResetLayout} />
      
      {pendingMove && (
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '16px 24px', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 16 }}>
          <strong style={{ fontSize: '1.1em' }}>Reassign to {pendingMove.label}?</strong>
          <button onClick={async () => {
             await moveHorseMut({ variables: { horseId: pendingMove.horseId, departmentId: pendingMove.departmentId } });
             setPendingMove(null);
             refetch();
          }} style={{ background: '#34c759', color: 'white', fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Confirm Transfer</button>
          <button onClick={() => setPendingMove(null)} style={{ background: '#e5e5ea', color: '#333', fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={visibleNodes}
          edges={viewControls.hideEdges ? [] : edges.map((e) => ({
             ...e, 
             data: { 
                 ...e.data, 
                 onDelete: (edgeId: string) => {
                    const mappedEdge = edges.find(ed => ed.id === edgeId);
                    if (mappedEdge) onEdgesDelete([mappedEdge]);
                    setEdges(eds => eds.filter(x => x.id !== edgeId)); // Optimistic UI
                 } 
             }
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onReconnect={onReconnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <PedigreeGraph />
    </ReactFlowProvider>
  );
}
