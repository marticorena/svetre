import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Mars, Venus, ShieldAlert, ShieldCheck, Ghost, ChevronUp, ChevronDown, MapPin, Lock, Unlock } from 'lucide-react';

export function HorseNode({ data }: NodeProps<any>) {
  const isMale = data.sex === 'Male';
  const bgColor = isMale ? 'rgba(238, 246, 255, 0.85)' : 'rgba(255, 240, 248, 0.85)';
  const borderColor = 'rgba(0,0,0,0.06)';
  
  const statusConfig: any = {
    alive: { color: '#34c759', label: 'ALIVE', Icon: ShieldCheck },
    in_service: { color: '#007aff', label: 'IN SERVICE', Icon: ShieldAlert },
    retired: { color: '#ff9500', label: 'RETIRED', Icon: ShieldCheck },
    deceased: { color: '#8e8e93', label: 'DECEASED', Icon: Ghost },
  };
  const sc = statusConfig[data.status] || statusConfig.in_service;
  const StatusIcon = sc.Icon;

  // Use dynamic edge visibility instead of static expanded state if available
  const pExp = data.parentsVisible !== undefined ? data.parentsVisible : !!data.parentsExpanded;
  const cExp = data.childrenVisible !== undefined ? data.childrenVisible : !!data.childrenExpanded;

  const ageCalc = data.dateOfBirth ? Math.floor((new Date().getTime() - new Date(data.dateOfBirth).getTime()) / 31557600000) : '?';
  const isLocked = data.lockedNodeId === data.id;

  return (
    <div className="horse-card-container" style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, position: 'relative', boxShadow: isLocked ? '0 0 0 3px #007aff, 0 8px 30px rgba(0,122,255,0.3)' : 'none', transition: 'box-shadow 0.2s' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#c7c7cc', width: '10px', height: '10px', border: 'none' }} />
      
      {data.setLockedNodeId && (
        <button 
          onClick={() => data.setLockedNodeId(isLocked ? null : data.id)}
          style={{ position: 'absolute', top: 12, right: 12, background: isLocked ? '#007aff' : 'transparent', color: isLocked ? 'white' : '#999', border: 'none', padding: 4, borderRadius: 6, cursor: 'pointer', zIndex: 10 }}
          title={isLocked ? "Unlock Focus" : "Lock Focus"}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      )}

      <div 
        className="chevron-strip top" 
        style={{ opacity: data.hasParents ? 1 : 0.2, cursor: data.hasParents ? 'pointer' : 'default', display: 'flex', gap: 6 }}
        onClick={(e) => { e.stopPropagation(); data.hasParents && data.onToggleParents?.(data.id, pExp); }}
      >
        {pExp ? <ChevronDown size={18} strokeWidth={3}/> : <ChevronUp size={18} strokeWidth={3}/>}
        {data.parentCount > 0 && <span style={{fontSize: 11, fontWeight: 700}}>({data.parentCount})</span>}
      </div>

      <div className="horse-title" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        {data.name} 
        {isMale ? <Mars size={18} color="#007aff" /> : <Venus size={18} color="#ff2d55" />}
      </div>
      
      <div className="horse-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <span style={{ 
            background: sc.color, color: 'white', padding: '4px 10px', borderRadius: '16px', 
            fontSize: '0.75em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 
        }}>
          <StatusIcon size={12} strokeWidth={3} /> {sc.label}
        </span>
        <div style={{ fontSize: '0.85em', color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
          <strong>Age:</strong> {ageCalc} 
        </div>
      </div>

      {data.department?.name && (
        <div style={{ fontSize: '0.8em', color: '#666', background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '8px', textAlign: 'center', marginTop: 4 }}>
           <MapPin size={12} style={{verticalAlign: 'middle', marginRight: 4}}/>
           {data.department.name} <span style={{opacity:0.6}}>({data.department.city})</span>
        </div>
      )}

      <div 
        className="chevron-strip bottom" 
        style={{ opacity: data.hasChildren ? 1 : 0.2, cursor: data.hasChildren ? 'pointer' : 'default', display: 'flex', gap: 6 }}
        onClick={(e) => { e.stopPropagation(); data.hasChildren && data.onToggleChildren?.(data.id, cExp); }}
      >
        {cExp ? <ChevronUp size={18} strokeWidth={3}/> : <ChevronDown size={18} strokeWidth={3}/>}
        {data.childCount > 0 && <span style={{fontSize: 11, fontWeight: 700}}>({data.childCount})</span>}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#c7c7cc', width: '10px', height: '10px', border: 'none' }} />
    </div>
  );
}
