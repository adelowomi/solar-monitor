import { fmtKw } from "../lib/format";

interface FlowInfo {
  flowDirection: number | null;
  isLight: boolean;
}

interface EnergyFlowDiagramProps {
  pvPower: number;
  batteryPower: number;
  loadPower: number;
  acInputPower: number;
  soc: number;
  gridOn: boolean;
  pvPanelFlow: FlowInfo;
  gridFlow: FlowInfo;
  batteryFlow: FlowInfo;
  loadFlow: FlowInfo;
}

/* ------------------------------------------------------------------ */
/*  Layout — diamond arrangement, inverter hub in the center          */
/*  Solar top, Load bottom, Battery left, Grid right                  */
/* ------------------------------------------------------------------ */
const W = 480;
const H = 340;
const CX = W / 2;
const CY = H / 2;

const SOLAR   = { x: CX,       y: 52 };
const LOAD    = { x: CX,       y: H - 52 };
const BATTERY = { x: 72,       y: CY };
const GRID    = { x: W - 72,   y: CY };

/* Smooth cubic bezier paths from each node to the center hub */
const PATH_SOLAR   = `M ${SOLAR.x} ${SOLAR.y + 38} C ${SOLAR.x} ${CY - 30}, ${CX} ${CY - 30}, ${CX} ${CY - 16}`;
const PATH_LOAD    = `M ${CX} ${CY + 16} C ${CX} ${CY + 30}, ${LOAD.x} ${CY + 30}, ${LOAD.x} ${LOAD.y - 38}`;
const PATH_BATTERY = `M ${BATTERY.x + 38} ${BATTERY.y} C ${CX - 40} ${BATTERY.y}, ${CX - 40} ${CY}, ${CX - 16} ${CY}`;
const PATH_GRID    = `M ${CX + 16} ${CY} C ${CX + 40} ${CY}, ${CX + 40} ${GRID.y}, ${GRID.x - 38} ${GRID.y}`;

/* ------------------------------------------------------------------ */
/*  Animated particles that travel along a path                       */
/* ------------------------------------------------------------------ */
function FlowParticles({
  pathId,
  color,
  reverse,
  speed = 2,
}: {
  pathId: string;
  color: string;
  reverse?: boolean;
  speed?: number;
}) {
  const count = 4;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const delay = (i / count) * speed;
        return (
          <circle key={i} r="3.5" opacity="0">
            <animateMotion
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
              keyPoints={reverse ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
            {/* Fade in at start, hold, fade out at end */}
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
            {/* Subtle size pulse */}
            <animate
              attributeName="r"
              values="2.5;3.5;2.5"
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          </circle>
        );
      })}
      {/* Glow particles (larger, more transparent, behind) */}
      {Array.from({ length: count }, (_, i) => {
        const delay = (i / count) * speed;
        return (
          <circle key={`g${i}`} r="7" fill={color} opacity="0" filter="url(#particleGlow)">
            <animateMotion
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
              keyPoints={reverse ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;0.4;0.4;0"
              keyTimes="0;0.1;0.85;1"
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          </circle>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Flow channel: track line + glow + power label + particles         */
/* ------------------------------------------------------------------ */
function FlowChannel({
  pathId,
  d,
  active,
  color,
  reverse,
  power,
  labelOffset,
}: {
  pathId: string;
  d: string;
  active: boolean;
  color: string;
  reverse?: boolean;
  power?: string;
  labelOffset?: { x: number; y: number };
}) {
  return (
    <g>
      {/* Inactive track */}
      <path
        id={pathId}
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {active && (
        <>
          {/* Active glow line (wide, blurred) */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.1"
            filter="url(#lineGlow)"
          />
          {/* Active core line */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          {/* Particles */}
          <FlowParticles pathId={pathId} color={color} reverse={reverse} />
          {/* Power label on the line */}
          {power && labelOffset && (
            <g>
              <rect
                x={labelOffset.x - 28}
                y={labelOffset.y - 9}
                width="56"
                height="18"
                rx="9"
                fill="rgba(15,23,42,0.8)"
                stroke={color}
                strokeWidth="0.5"
                opacity="0.9"
              />
              <text
                x={labelOffset.x}
                y={labelOffset.y + 4}
                textAnchor="middle"
                fill={color}
                fontSize="9"
                fontWeight="500"
                fontFamily="system-ui, sans-serif"
              >
                {power}
              </text>
            </g>
          )}
        </>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Node: icon circle + label + value                                 */
/* ------------------------------------------------------------------ */
function FlowNode({
  x,
  y,
  color,
  label,
  value,
  secondaryValue,
  active,
  icon,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  value: string;
  secondaryValue?: string;
  active: boolean;
  icon: string;
}) {
  const dim = active ? 1 : 0.4;
  return (
    <g opacity={dim}>
      {/* Outer glow when active */}
      {active && (
        <circle cx={x} cy={y} r="30" fill={color} opacity="0.06" filter="url(#nodeGlow)" />
      )}
      {/* Background circle */}
      <circle
        cx={x}
        cy={y}
        r="26"
        fill="rgba(15,23,42,0.9)"
        stroke={active ? color : "rgba(255,255,255,0.08)"}
        strokeWidth={active ? 1.5 : 1}
      />
      {/* Icon emoji/text */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
      >
        {icon}
      </text>
      {/* Value below */}
      <text
        x={x}
        y={y + 42}
        textAnchor="middle"
        fill={color}
        fontSize="13"
        fontWeight="600"
        fontFamily="'Fraunces', serif"
        className="tabular-nums"
      >
        {value}
      </text>
      {/* Secondary value */}
      {secondaryValue && (
        <text
          x={x}
          y={y + 55}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          {secondaryValue}
        </text>
      )}
      {/* Label above */}
      <text
        x={x}
        y={y - 35}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize="10"
        fontWeight="500"
        letterSpacing="0.05em"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function EnergyFlowDiagram({
  pvPower,
  batteryPower,
  loadPower,
  acInputPower,
  soc,
  gridOn,
  pvPanelFlow,
  gridFlow,
  batteryFlow,
  loadFlow,
}: EnergyFlowDiagramProps) {
  const solarActive = pvPanelFlow.isLight && pvPower > 0.01;
  const batteryCharging = batteryPower > 0.01;
  const batteryDischarging = batteryPower < -0.01;
  const batteryActive = batteryFlow.isLight && (batteryCharging || batteryDischarging);
  const gridActive = gridFlow.isLight && gridOn;
  const loadActive = loadFlow.isLight && loadPower > 0.01;

  const battColor = batteryCharging ? "#34d399" : "#34d399";
  const battLabel = batteryCharging ? "charging" : batteryDischarging ? "discharging" : "";

  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-5 mb-6 overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filters */}
          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Center inverter hub */}
        <circle cx={CX} cy={CY} r="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.25)"
          fontSize="8"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
          letterSpacing="0.05em"
        >
          INV
        </text>

        {/* Flow channels */}
        <FlowChannel
          pathId="path-solar"
          d={PATH_SOLAR}
          active={solarActive}
          color="#fbbf24"
          power={solarActive ? fmtKw(pvPower) : undefined}
          labelOffset={{ x: CX + 38, y: CY - 42 }}
        />
        <FlowChannel
          pathId="path-load"
          d={PATH_LOAD}
          active={loadActive}
          color="#a78bfa"
          power={loadActive ? fmtKw(loadPower) : undefined}
          labelOffset={{ x: CX - 38, y: CY + 42 }}
        />
        <FlowChannel
          pathId="path-battery"
          d={PATH_BATTERY}
          active={batteryActive}
          color={battColor}
          reverse={batteryCharging}
          power={batteryActive ? fmtKw(Math.abs(batteryPower)) : undefined}
          labelOffset={{ x: CX - 62, y: CY - 22 }}
        />
        <FlowChannel
          pathId="path-grid"
          d={PATH_GRID}
          active={gridActive}
          color="#38bdf8"
          power={gridActive ? fmtKw(acInputPower) : undefined}
          labelOffset={{ x: CX + 62, y: CY + 22 }}
        />

        {/* Nodes */}
        <FlowNode
          x={SOLAR.x}
          y={SOLAR.y}
          color="#fbbf24"
          label="SOLAR"
          value={fmtKw(pvPower)}
          active={solarActive}
          icon="☀️"
        />
        <FlowNode
          x={LOAD.x}
          y={LOAD.y}
          color="#a78bfa"
          label="HOME"
          value={fmtKw(loadPower)}
          active={loadActive}
          icon="🏠"
        />
        <FlowNode
          x={BATTERY.x}
          y={BATTERY.y}
          color={battColor}
          label="BATTERY"
          value={`${soc}%`}
          secondaryValue={battLabel}
          active={batteryActive || soc > 0}
          icon="🔋"
        />
        <FlowNode
          x={GRID.x}
          y={GRID.y}
          color={gridOn ? "#38bdf8" : "#ef4444"}
          label="GRID"
          value={gridOn ? "Online" : "Offline"}
          active={gridActive}
          icon="⚡"
        />
      </svg>
    </div>
  );
}
