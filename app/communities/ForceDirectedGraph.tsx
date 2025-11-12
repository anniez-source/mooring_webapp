'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Cluster {
  cluster_id: string;
  label: string;
  keywords: string[];
  member_count: number;
  member_ids: string[];
}

interface Node extends Cluster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Edge {
  source: string;
  target: string;
  sharedCount: number;
  thickness: number;
}

interface ForceDirectedGraphProps {
  clusters: Cluster[];
  currentUserId: string | null;
  onClusterClick: (clusterId: string) => void;
}

// Color palette for cluster categories
const getCategoryColor = (label: string): string => {
  const lower = label.toLowerCase();
  if (lower.includes('climate') || lower.includes('ocean') || lower.includes('environmental')) return '#0891b2';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('telehealth')) return '#dc2626';
  if (lower.includes('ai') || lower.includes('robotics') || lower.includes('automation')) return '#6366f1';
  if (lower.includes('education') || lower.includes('edtech') || lower.includes('teacher')) return '#f59e0b';
  if (lower.includes('finance') || lower.includes('fintech')) return '#10b981';
  if (lower.includes('agriculture') || lower.includes('ag-tech') || lower.includes('farming')) return '#84cc16';
  if (lower.includes('manufacturing') || lower.includes('logistics')) return '#8b5cf6';
  if (lower.includes('data') || lower.includes('analytics')) return '#06b6d4';
  return '#64748b'; // Default gray
};

const getCategoryName = (label: string): string => {
  const lower = label.toLowerCase();
  if (lower.includes('climate') || lower.includes('ocean') || lower.includes('environmental')) return 'Climate & Environment';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('telehealth')) return 'Healthcare';
  if (lower.includes('ai') || lower.includes('robotics') || lower.includes('automation')) return 'AI & Robotics';
  if (lower.includes('education') || lower.includes('edtech') || lower.includes('teacher')) return 'Education';
  if (lower.includes('finance') || lower.includes('fintech')) return 'Finance';
  if (lower.includes('agriculture') || lower.includes('ag-tech') || lower.includes('farming')) return 'Agriculture';
  if (lower.includes('manufacturing') || lower.includes('logistics')) return 'Manufacturing & Logistics';
  if (lower.includes('data') || lower.includes('analytics')) return 'Data & Analytics';
  return 'Other';
};

export default function ForceDirectedGraph({ clusters, currentUserId, onClusterClick }: ForceDirectedGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ source: string; target: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'connected'>('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const width = 1600;
  const height = 1000;

  // Calculate edges (shared members between clusters)
  const calculateEdges = useMemo(() => {
    const edgesList: Edge[] = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];
        
        const sharedMembers = cluster1.member_ids.filter(id => 
          cluster2.member_ids.includes(id)
        );
        
        if (sharedMembers.length > 0) {
          edgesList.push({
            source: cluster1.cluster_id,
            target: cluster2.cluster_id,
            sharedCount: sharedMembers.length,
            thickness: Math.sqrt(sharedMembers.length) * 1.5
          });
        }
      }
    }
    
    return edgesList;
  }, [clusters]);

  // Initialize nodes with physics properties
  useEffect(() => {
    if (clusters.length === 0) return;

    const minSize = Math.min(...clusters.map(c => c.member_count));
    const maxSize = Math.max(...clusters.map(c => c.member_count));
    
    const initialNodes: Node[] = clusters.map((cluster, i) => {
      // Spiral initialization for better initial distribution
      const angle = i * 0.618 * 2 * Math.PI; // Golden angle
      const radius = Math.sqrt(i) * 80;
      
      return {
        ...cluster,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 30 + ((cluster.member_count - minSize) / (maxSize - minSize)) * 50,
        color: getCategoryColor(cluster.label)
      };
    });
    
    setNodes(initialNodes);
    setEdges(calculateEdges);
  }, [clusters, calculateEdges, width, height]);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        
        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          let fx = 0;
          let fy = 0;
          
          // Repulsion between all nodes (strong to prevent overlap)
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = newNodes[i].radius + newNodes[j].radius + 40; // Extra padding
            
            if (distance < minDistance) {
              const force = (minDistance - distance) / distance * 2; // Strong repulsion
              fx += dx * force;
              fy += dy * force;
            } else if (distance < 300) {
              // Gentle repulsion at medium range
              const force = 0.1 / (distance * distance);
              fx += dx * force;
              fy += dy * force;
            }
          }
          
          // Attraction along edges (connected clusters stay closer)
          edges.forEach(edge => {
            let otherIndex = -1;
            let isSource = false;
            
            if (edge.source === newNodes[i].cluster_id) {
              otherIndex = newNodes.findIndex(n => n.cluster_id === edge.target);
              isSource = true;
            } else if (edge.target === newNodes[i].cluster_id) {
              otherIndex = newNodes.findIndex(n => n.cluster_id === edge.source);
              isSource = false;
            }
            
            if (otherIndex >= 0) {
              const dx = newNodes[otherIndex].x - newNodes[i].x;
              const dy = newNodes[otherIndex].y - newNodes[i].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const targetDistance = 250; // Ideal edge length
              
              if (distance > targetDistance) {
                const force = (distance - targetDistance) / distance * 0.01 * edge.sharedCount;
                fx += dx * force;
                fy += dy * force;
              }
            }
          });
          
          // Gravity towards center (gentle)
          const centerX = width / 2;
          const centerY = height / 2;
          const dx = centerX - newNodes[i].x;
          const dy = centerY - newNodes[i].y;
          fx += dx * 0.0005;
          fy += dy * 0.0005;
          
          // Apply velocity with damping
          newNodes[i].vx = (newNodes[i].vx + fx) * 0.85;
          newNodes[i].vy = (newNodes[i].vy + fy) * 0.85;
          
          // Update position
          newNodes[i].x += newNodes[i].vx;
          newNodes[i].y += newNodes[i].vy;
          
          // Boundary constraints (with padding)
          const padding = newNodes[i].radius + 20;
          if (newNodes[i].x < padding) {
            newNodes[i].x = padding;
            newNodes[i].vx *= -0.5;
          }
          if (newNodes[i].x > width - padding) {
            newNodes[i].x = width - padding;
            newNodes[i].vx *= -0.5;
          }
          if (newNodes[i].y < padding) {
            newNodes[i].y = padding;
            newNodes[i].vy *= -0.5;
          }
          if (newNodes[i].y > height - padding) {
            newNodes[i].y = height - padding;
            newNodes[i].vy *= -0.5;
          }
        }
        
        return newNodes;
      });
      
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    animationRef.current = requestAnimationFrame(simulate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, edges, width, height]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    
    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Determine filtered nodes
    const filteredNodeIds = new Set<string>();
    const highlightedNodeIds = new Set<string>();
    
    if (searchTerm) {
      nodes.forEach(node => {
        if (node.label.toLowerCase().includes(searchTerm.toLowerCase())) {
          highlightedNodeIds.add(node.cluster_id);
        }
      });
    }
    
    if (selectedNode) {
      highlightedNodeIds.add(selectedNode);
      edges.forEach(edge => {
        if (edge.source === selectedNode) {
          highlightedNodeIds.add(edge.target);
        } else if (edge.target === selectedNode) {
          highlightedNodeIds.add(edge.source);
        }
      });
    }
    
    if (filterMode === 'connected' && selectedNode) {
      filteredNodeIds.add(selectedNode);
      edges.forEach(edge => {
        if (edge.source === selectedNode) filteredNodeIds.add(edge.target);
        if (edge.target === selectedNode) filteredNodeIds.add(edge.source);
      });
    }
    
    const shouldShow = (nodeId: string) => {
      if (filterMode === 'connected' && selectedNode) {
        return filteredNodeIds.has(nodeId);
      }
      return true;
    };
    
    const getOpacity = (nodeId: string) => {
      if (searchTerm && highlightedNodeIds.size > 0) {
        return highlightedNodeIds.has(nodeId) ? 1 : 0.15;
      }
      if (selectedNode) {
        return highlightedNodeIds.has(nodeId) ? 1 : 0.2;
      }
      return 1;
    };
    
    // Draw edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.cluster_id === edge.source);
      const targetNode = nodes.find(n => n.cluster_id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      if (!shouldShow(edge.source) || !shouldShow(edge.target)) return;
      
      const isHovered = hoveredEdge?.source === edge.source && hoveredEdge?.target === edge.target;
      const opacity = Math.min(getOpacity(edge.source), getOpacity(edge.target));
      
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = isHovered 
        ? `rgba(100, 116, 139, ${opacity})`
        : `rgba(203, 213, 225, ${opacity * 0.6})`;
      ctx.lineWidth = isHovered ? edge.thickness + 2 : edge.thickness;
      ctx.stroke();
    });
    
    // Draw nodes
    nodes.forEach(node => {
      if (!shouldShow(node.cluster_id)) return;
      
      const isHovered = hoveredNode === node.cluster_id;
      const isSelected = selectedNode === node.cluster_id;
      const opacity = getOpacity(node.cluster_id);
      
      // Node shadow
      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = `${node.color}30`;
        ctx.fill();
      }
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = `${node.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#000000' : '#ffffff';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.stroke();
      
      // Member count
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.member_count.toString(), node.x, node.y);
    });
    
    ctx.restore();
  }, [nodes, edges, hoveredNode, selectedNode, hoveredEdge, searchTerm, filterMode, zoom, pan, width, height]);

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) - pan.x) / zoom;
    const mouseY = ((e.clientY - rect.top) - pan.y) / zoom;
    
    if (isDragging) {
      setPan({
        x: pan.x + (e.clientX - dragStart.x),
        y: pan.y + (e.clientY - dragStart.y)
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Check for hovered node
    let foundNode = false;
    for (const node of nodes) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < node.radius) {
        setHoveredNode(node.cluster_id);
        foundNode = true;
        break;
      }
    }
    if (!foundNode) setHoveredNode(null);
    
    // Check for hovered edge
    let foundEdge = false;
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.cluster_id === edge.source);
      const targetNode = nodes.find(n => n.cluster_id === edge.target);
      if (!sourceNode || !targetNode) continue;
      
      const distToEdge = pointToLineDistance(
        mouseX, mouseY,
        sourceNode.x, sourceNode.y,
        targetNode.x, targetNode.y
      );
      
      if (distToEdge < 10) {
        setHoveredEdge({ source: edge.source, target: edge.target });
        foundEdge = true;
        break;
      }
    }
    if (!foundEdge) setHoveredEdge(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNode(selectedNode === hoveredNode ? null : hoveredNode);
      onClusterClick(hoveredNode);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Get unique categories for legend
  const categories = useMemo(() => {
    const catSet = new Set(clusters.map(c => getCategoryName(c.label)));
    return Array.from(catSet).map(name => ({
      name,
      color: getCategoryColor(clusters.find(c => getCategoryName(c.label) === name)?.label || '')
    }));
  }, [clusters]);

  // Hovered node/edge details
  const hoveredNodeData = nodes.find(n => n.cluster_id === hoveredNode);
  const hoveredEdgeData = hoveredEdge ? edges.find(e => 
    e.source === hoveredEdge.source && e.target === hoveredEdge.target
  ) : null;
  const connectionCount = hoveredNodeData ? edges.filter(e => 
    e.source === hoveredNodeData.cluster_id || e.target === hoveredNodeData.cluster_id
  ).length : 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Controls */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        
        {/* Filter mode */}
        {selectedNode && (
          <button
            onClick={() => setFilterMode(filterMode === 'all' ? 'connected' : 'all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterMode === 'connected'
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {filterMode === 'connected' ? 'Show All' : 'Show Connected Only'}
          </button>
        )}
        
        {/* Zoom controls */}
        <div className="flex gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cursor-move"
          style={{ width: '100%', height: 'auto' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-stone-200">
        <h3 className="text-sm font-semibold text-stone-900 mb-3">Categories</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {categories.map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm text-stone-700">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {(hoveredNodeData || hoveredEdgeData) && (
        <div className="absolute top-4 right-4 bg-white border border-stone-200 rounded-lg shadow-lg p-4 max-w-xs pointer-events-none">
          {hoveredNodeData && (
            <>
              <h3 className="font-semibold text-stone-900 mb-2">{hoveredNodeData.label}</h3>
              <div className="space-y-1 text-sm text-stone-600">
                <p><span className="font-medium">Members:</span> {hoveredNodeData.member_count}</p>
                <p><span className="font-medium">Connections:</span> {connectionCount}</p>
                {hoveredNodeData.keywords.length > 0 && (
                  <p className="text-xs text-stone-500 mt-2">
                    {hoveredNodeData.keywords.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            </>
          )}
          {hoveredEdgeData && !hoveredNodeData && (
            <>
              <h3 className="font-semibold text-stone-900 mb-2">Shared Members</h3>
              <p className="text-sm text-stone-600">
                {hoveredEdgeData.sharedCount} member{hoveredEdgeData.sharedCount !== 1 ? 's' : ''} in both clusters
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: Point to line segment distance
function pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

