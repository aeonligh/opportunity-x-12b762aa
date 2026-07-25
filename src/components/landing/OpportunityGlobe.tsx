import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

// Real-world opportunity anchors — organization + country + [lat, lng]
export const OPPORTUNITY_NODES = [
  { name: "DAAD", country: "Germany", lat: 52.52, lng: 13.405, kind: "Scholarship" },
  { name: "Chevening", country: "United Kingdom", lat: 51.5074, lng: -0.1278, kind: "Fellowship" },
  { name: "Fulbright", country: "United States", lat: 38.9072, lng: -77.0369, kind: "Scholarship" },
  { name: "MEXT", country: "Japan", lat: 35.6762, lng: 139.6503, kind: "Scholarship" },
  { name: "Erasmus+", country: "Belgium", lat: 50.8503, lng: 4.3517, kind: "Program" },
  { name: "Rhodes", country: "United Kingdom", lat: 51.7548, lng: -1.2544, kind: "Scholarship" },
  { name: "Mastercard Foundation", country: "Canada", lat: 43.6532, lng: -79.3832, kind: "Scholarship" },
  { name: "Australia Awards", country: "Australia", lat: -35.2809, lng: 149.13, kind: "Scholarship" },
  { name: "Swiss Excellence", country: "Switzerland", lat: 46.9481, lng: 7.4474, kind: "Scholarship" },
  { name: "Eiffel", country: "France", lat: 48.8566, lng: 2.3522, kind: "Scholarship" },
  { name: "KAIST", country: "South Korea", lat: 36.3729, lng: 127.3607, kind: "Research" },
  { name: "Holland Scholarship", country: "Netherlands", lat: 52.3676, lng: 4.9041, kind: "Scholarship" },
  { name: "China CSC", country: "China", lat: 39.9042, lng: 116.4074, kind: "Scholarship" },
  { name: "MITACS", country: "Canada", lat: 45.5017, lng: -73.5673, kind: "Internship" },
  { name: "African Union", country: "Ethiopia", lat: 9.03, lng: 38.74, kind: "Fellowship" },
  { name: "OWSD", country: "Italy", lat: 45.6495, lng: 13.7768, kind: "Research" },
  { name: "Aga Khan", country: "Kenya", lat: -1.2921, lng: 36.8219, kind: "Scholarship" },
  { name: "Wits", country: "South Africa", lat: -26.2041, lng: 28.0473, kind: "Scholarship" },
  { name: "NTU", country: "Singapore", lat: 1.3521, lng: 103.8198, kind: "Research" },
  { name: "IIT Bombay", country: "India", lat: 19.076, lng: 72.8777, kind: "Research" },
  { name: "USP", country: "Brazil", lat: -23.5505, lng: -46.6333, kind: "Scholarship" },
  { name: "UNAM", country: "Mexico", lat: 19.4326, lng: -99.1332, kind: "Scholarship" },
  { name: "Google Research", country: "United States", lat: 37.4419, lng: -122.143, kind: "Internship" },
  { name: "Max Planck", country: "Germany", lat: 48.1351, lng: 11.582, kind: "Research" },
  { name: "TU Delft", country: "Netherlands", lat: 52.0022, lng: 4.3736, kind: "Research" },
  { name: "ETH Zürich", country: "Switzerland", lat: 47.3769, lng: 8.5417, kind: "Research" },
  { name: "KAUST", country: "Saudi Arabia", lat: 22.3092, lng: 39.1043, kind: "Scholarship" },
  { name: "NYU Abu Dhabi", country: "UAE", lat: 24.4539, lng: 54.3773, kind: "Scholarship" },
  { name: "UBA", country: "Argentina", lat: -34.6037, lng: -58.3816, kind: "Scholarship" },
  { name: "MBZUAI", country: "UAE", lat: 24.4667, lng: 54.6, kind: "Research" },
];

const R = 1;

function latLngToVec3(lat: number, lng: number, radius = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function Earth({ activeCount }: { activeCount: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame((_, delta) => {
    if (groupRef.current && hovered === null) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const nodes = useMemo(
    () =>
      OPPORTUNITY_NODES.map((n) => ({
        ...n,
        pos: latLngToVec3(n.lat, n.lng, R * 1.005),
      })),
    [],
  );

  // Connection arcs between random pairs of active nodes
  const arcs = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push([i * 3 % OPPORTUNITY_NODES.length, (i * 3 + 7) % OPPORTUNITY_NODES.length]);
    }
    return pairs.map(([a, b]) => {
      const start = latLngToVec3(OPPORTUNITY_NODES[a].lat, OPPORTUNITY_NODES[a].lng, R * 1.005);
      const end = latLngToVec3(OPPORTUNITY_NODES[b].lat, OPPORTUNITY_NODES[b].lng, R * 1.005);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(40);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      return { geom, a, b };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Sphere with subtle wireframe overlay for "earth" feel */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial
          color="#0b1220"
          roughness={1}
          metalness={0.1}
          emissive="#0a1a2e"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.001, 48, 48]} />
        <meshBasicMaterial color="#1d4ed8" wireframe transparent opacity={0.12} />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[R * 1.08, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Opportunity nodes */}
      {nodes.map((n, i) => {
        const isActive = i < activeCount;
        const isHover = hovered === i;
        return (
          <group key={n.name} position={n.pos}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(i);
              }}
              onPointerOut={() => setHovered(null)}
            >
              <sphereGeometry args={[isHover ? 0.028 : 0.016, 16, 16]} />
              <meshBasicMaterial
                color={isActive ? "#34d399" : "#22d3ee"}
                transparent
                opacity={isActive ? 1 : 0.35}
              />
            </mesh>
            {isActive && (
              <mesh>
                <ringGeometry args={[0.03, 0.05, 24]} />
                <meshBasicMaterial color="#34d399" transparent opacity={0.5} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Arcs */}
      {arcs.map((arc, i) => {
        const visible = arc.a < activeCount && arc.b < activeCount;
        if (!visible) return null;
        return (
          <line key={i}>
            <primitive object={arc.geom} attach="geometry" />
            <lineBasicMaterial color="#22d3ee" transparent opacity={0.4} />
          </line>
        );
      })}

      {/* Hovered label */}
      {hovered !== null && (
        <group position={nodes[hovered].pos.clone().multiplyScalar(1.25)}>
          <mesh>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function OpportunityGlobe({ activeCount = 30 }: { activeCount?: number }) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  return (
    <div className="relative w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 2, 4]} intensity={1.1} color="#93c5fd" />
        <directionalLight position={[-3, -2, -2]} intensity={0.4} color="#22d3ee" />
        <Suspense fallback={null}>
          <Earth activeCount={activeCount} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.6}
          maxDistance={4}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.4}
          rotateSpeed={0.6}
        />
      </Canvas>
      {hoveredLabel && (
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur-md border border-border text-xs">
          {hoveredLabel}
        </div>
      )}
    </div>
  );
}
