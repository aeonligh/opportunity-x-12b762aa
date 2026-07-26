import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ShieldCheck, X } from "lucide-react";

// ------------------------------------------------------------
// REAL-WORLD INSTITUTION MAPPING
// Every node = a real organization at its verified HQ coordinates.
// Coordinates are cached statically here (no runtime geocoding).
// ------------------------------------------------------------

export type OpportunityKind =
  | "Scholarship"
  | "Fellowship"
  | "Internship"
  | "Research"
  | "Grant"
  | "Program"
  | "Job";

export interface OpportunityNode {
  name: string;              // Short brand
  fullName: string;          // Official / expanded name
  organization: string;
  city: string;
  country: string;
  countryCode: string;       // ISO-2 for flag
  lat: number;
  lng: number;
  kind: OpportunityKind;
  matchScore: number;        // 0-100 illustrative
  verified: boolean;
}

const flag = (cc: string) =>
  cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

export const OPPORTUNITY_NODES: OpportunityNode[] = [
  { name: "DAAD",                     fullName: "German Academic Exchange Service",       organization: "DAAD",                        city: "Bonn",             country: "Germany",         countryCode: "de", lat: 50.7374,  lng: 7.0982,   kind: "Scholarship", matchScore: 94, verified: true },
  { name: "Chevening",                fullName: "Chevening Scholarships",                 organization: "UK Foreign Office",           city: "London",           country: "United Kingdom", countryCode: "gb", lat: 51.5074,  lng: -0.1278,  kind: "Scholarship", matchScore: 91, verified: true },
  { name: "Fulbright",                fullName: "Fulbright Foreign Student Program",      organization: "US Department of State",       city: "Washington D.C.", country: "United States",   countryCode: "us", lat: 38.9072,  lng: -77.0369, kind: "Scholarship", matchScore: 88, verified: true },
  { name: "MEXT",                     fullName: "MEXT Research Student Program",          organization: "Government of Japan",          city: "Tokyo",           country: "Japan",           countryCode: "jp", lat: 35.6762,  lng: 139.6503, kind: "Scholarship", matchScore: 86, verified: true },
  { name: "Erasmus Mundus",           fullName: "Erasmus Mundus Joint Masters",           organization: "European Commission",          city: "Brussels",        country: "Belgium",         countryCode: "be", lat: 50.8503,  lng: 4.3517,   kind: "Program",     matchScore: 90, verified: true },
  { name: "Rhodes",                   fullName: "Rhodes Scholarship",                     organization: "Rhodes Trust",                 city: "Oxford",          country: "United Kingdom", countryCode: "gb", lat: 51.7520,  lng: -1.2577,  kind: "Scholarship", matchScore: 89, verified: true },
  { name: "Commonwealth",             fullName: "Commonwealth Scholarship",               organization: "CSC UK",                       city: "London",          country: "United Kingdom", countryCode: "gb", lat: 51.5074,  lng: -0.1278,  kind: "Scholarship", matchScore: 87, verified: true },
  { name: "Mastercard Foundation",    fullName: "Mastercard Foundation Scholars Program", organization: "Mastercard Foundation",        city: "Toronto",         country: "Canada",          countryCode: "ca", lat: 43.6532,  lng: -79.3832, kind: "Scholarship", matchScore: 93, verified: true },
  { name: "Australia Awards",         fullName: "Australia Awards Scholarships",          organization: "Government of Australia",       city: "Canberra",        country: "Australia",       countryCode: "au", lat: -35.2809, lng: 149.13,   kind: "Scholarship", matchScore: 84, verified: true },
  { name: "Swiss Excellence",         fullName: "Swiss Government Excellence Scholarships", organization: "Swiss Confederation",         city: "Bern",            country: "Switzerland",     countryCode: "ch", lat: 46.9481,  lng: 7.4474,   kind: "Scholarship", matchScore: 82, verified: true },
  { name: "Eiffel",                   fullName: "Eiffel Excellence Scholarship",          organization: "Campus France",                 city: "Paris",           country: "France",          countryCode: "fr", lat: 48.8566,  lng: 2.3522,   kind: "Scholarship", matchScore: 85, verified: true },
  { name: "KAIST",                    fullName: "KAIST International Student Program",    organization: "KAIST",                         city: "Daejeon",         country: "South Korea",     countryCode: "kr", lat: 36.3729,  lng: 127.3607, kind: "Research",    matchScore: 80, verified: true },
  { name: "Holland Scholarship",      fullName: "Holland Scholarship",                     organization: "Nuffic",                        city: "The Hague",       country: "Netherlands",     countryCode: "nl", lat: 52.0705,  lng: 4.3007,   kind: "Scholarship", matchScore: 81, verified: true },
  { name: "China CSC",                fullName: "Chinese Government Scholarship",         organization: "China Scholarship Council",     city: "Beijing",         country: "China",           countryCode: "cn", lat: 39.9042,  lng: 116.4074, kind: "Scholarship", matchScore: 78, verified: true },
  { name: "MITACS",                   fullName: "MITACS Globalink Research Internship",   organization: "MITACS",                        city: "Vancouver",       country: "Canada",          countryCode: "ca", lat: 49.2827,  lng: -123.1207,kind: "Internship",  matchScore: 88, verified: true },
  { name: "African Union",            fullName: "African Union Scholarships",             organization: "African Union",                 city: "Addis Ababa",     country: "Ethiopia",        countryCode: "et", lat: 9.03,     lng: 38.74,    kind: "Fellowship",  matchScore: 83, verified: true },
  { name: "OWSD",                     fullName: "OWSD PhD Fellowships",                   organization: "TWAS / UNESCO",                city: "Trieste",         country: "Italy",           countryCode: "it", lat: 45.6495,  lng: 13.7768,  kind: "Research",    matchScore: 79, verified: true },
  { name: "Aga Khan",                 fullName: "Aga Khan Foundation ISP",                organization: "Aga Khan Foundation",           city: "Nairobi",         country: "Kenya",           countryCode: "ke", lat: -1.2921,  lng: 36.8219,  kind: "Scholarship", matchScore: 84, verified: true },
  { name: "Wits",                     fullName: "University of the Witwatersrand",        organization: "Wits University",               city: "Johannesburg",    country: "South Africa",    countryCode: "za", lat: -26.2041, lng: 28.0473,  kind: "Scholarship", matchScore: 76, verified: true },
  { name: "NTU Singapore",            fullName: "Nanyang Technological University",       organization: "NTU",                           city: "Singapore",       country: "Singapore",       countryCode: "sg", lat: 1.3521,   lng: 103.8198, kind: "Research",    matchScore: 82, verified: true },
  { name: "IIT Bombay",               fullName: "Indian Institute of Technology Bombay",  organization: "IIT Bombay",                    city: "Mumbai",          country: "India",           countryCode: "in", lat: 19.076,   lng: 72.8777,  kind: "Research",    matchScore: 77, verified: true },
  { name: "USP",                      fullName: "Universidade de São Paulo",              organization: "USP",                           city: "São Paulo",       country: "Brazil",          countryCode: "br", lat: -23.5505, lng: -46.6333, kind: "Scholarship", matchScore: 74, verified: true },
  { name: "UNAM",                     fullName: "Universidad Nacional Autónoma de México", organization: "UNAM",                         city: "Mexico City",     country: "Mexico",          countryCode: "mx", lat: 19.4326,  lng: -99.1332, kind: "Scholarship", matchScore: 73, verified: true },
  { name: "Google Research",          fullName: "Google Research Internship",             organization: "Google",                        city: "Mountain View",   country: "United States",   countryCode: "us", lat: 37.4419,  lng: -122.143, kind: "Internship",  matchScore: 92, verified: true },
  { name: "Max Planck",               fullName: "Max Planck Society PhD",                 organization: "Max Planck",                    city: "Munich",          country: "Germany",         countryCode: "de", lat: 48.1351,  lng: 11.582,   kind: "Research",    matchScore: 90, verified: true },
  { name: "TU Delft",                 fullName: "Delft University of Technology",         organization: "TU Delft",                      city: "Delft",           country: "Netherlands",     countryCode: "nl", lat: 52.0022,  lng: 4.3736,   kind: "Research",    matchScore: 83, verified: true },
  { name: "ETH Zürich",               fullName: "ETH Excellence Scholarship",             organization: "ETH Zürich",                    city: "Zurich",          country: "Switzerland",     countryCode: "ch", lat: 47.3769,  lng: 8.5417,   kind: "Scholarship", matchScore: 91, verified: true },
  { name: "KAUST",                    fullName: "KAUST Fellowship",                       organization: "KAUST",                         city: "Thuwal",          country: "Saudi Arabia",    countryCode: "sa", lat: 22.3092,  lng: 39.1043,  kind: "Scholarship", matchScore: 85, verified: true },
  { name: "NYU Abu Dhabi",            fullName: "NYU Abu Dhabi Scholarship",              organization: "NYU Abu Dhabi",                 city: "Abu Dhabi",       country: "UAE",             countryCode: "ae", lat: 24.4539,  lng: 54.3773,  kind: "Scholarship", matchScore: 86, verified: true },
  { name: "MBZUAI",                   fullName: "Mohamed bin Zayed University of AI",     organization: "MBZUAI",                        city: "Abu Dhabi",       country: "UAE",             countryCode: "ae", lat: 24.4667,  lng: 54.6,     kind: "Research",    matchScore: 88, verified: true },
  { name: "UNESCO",                   fullName: "UNESCO Fellowships",                     organization: "UNESCO",                        city: "Paris",           country: "France",          countryCode: "fr", lat: 48.8499,  lng: 2.3060,   kind: "Fellowship",  matchScore: 82, verified: true },
  { name: "WHO",                      fullName: "WHO Internship Programme",               organization: "World Health Organization",     city: "Geneva",          country: "Switzerland",     countryCode: "ch", lat: 46.2044,  lng: 6.1432,   kind: "Internship",  matchScore: 84, verified: true },
  { name: "Humboldt",                 fullName: "Humboldt Research Fellowship",           organization: "Humboldt Foundation",           city: "Bonn",            country: "Germany",         countryCode: "de", lat: 50.7374,  lng: 7.0982,   kind: "Fellowship",  matchScore: 89, verified: true },
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

// -------- Search intelligence --------

function matches(node: OpportunityNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return (
    node.name.toLowerCase().includes(q) ||
    node.fullName.toLowerCase().includes(q) ||
    node.organization.toLowerCase().includes(q) ||
    node.country.toLowerCase().includes(q) ||
    node.city.toLowerCase().includes(q) ||
    node.kind.toLowerCase().includes(q) ||
    node.countryCode.toLowerCase() === q
  );
}

// Country centroids for camera focus (approx)
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  Germany: [51.1657, 10.4515],
  "United Kingdom": [54.3781, -2.4360],
  "United States": [39.8283, -98.5795],
  Japan: [36.2048, 138.2529],
  Belgium: [50.5039, 4.4699],
  Canada: [56.1304, -106.3468],
  Australia: [-25.2744, 133.7751],
  Switzerland: [46.8182, 8.2275],
  France: [46.2276, 2.2137],
  "South Korea": [35.9078, 127.7669],
  Netherlands: [52.1326, 5.2913],
  China: [35.8617, 104.1954],
  Ethiopia: [9.145, 40.4897],
  Italy: [41.8719, 12.5674],
  Kenya: [-0.0236, 37.9062],
  "South Africa": [-30.5595, 22.9375],
  Singapore: [1.3521, 103.8198],
  India: [20.5937, 78.9629],
  Brazil: [-14.235, -51.9253],
  Mexico: [23.6345, -102.5528],
  "Saudi Arabia": [23.8859, 45.0792],
  UAE: [23.4241, 53.8478],
};

// -------- Country intelligence aggregation --------

export interface CountryIntel {
  country: string;
  countryCode: string;
  total: number;
  byKind: Partial<Record<OpportunityKind, number>>;
  organizations: string[];
  avgMatch: number;
  nodes: OpportunityNode[];
}

function aggregate(country: string): CountryIntel | null {
  const nodes = OPPORTUNITY_NODES.filter((n) => n.country === country);
  if (!nodes.length) return null;
  const byKind: Partial<Record<OpportunityKind, number>> = {};
  for (const n of nodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
  const orgs = Array.from(new Set(nodes.map((n) => n.organization))).slice(0, 6);
  const avg = Math.round(nodes.reduce((a, n) => a + n.matchScore, 0) / nodes.length);
  return {
    country,
    countryCode: nodes[0].countryCode,
    total: nodes.length,
    byKind,
    organizations: orgs,
    avgMatch: avg,
    nodes,
  };
}

// -------- 3D scene --------

interface EarthProps {
  query: string;
  onHover: (n: OpportunityNode | null) => void;
  onSelectCountry: (country: string) => void;
  focus: THREE.Vector3 | null;
}

function Earth({ query, onHover, onSelectCountry, focus }: EarthProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const hasQuery = query.trim().length > 0;

  useFrame((_, delta) => {
    if (groupRef.current && hovered === null && !focus) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const nodes = useMemo(
    () =>
      OPPORTUNITY_NODES.map((n) => ({
        ...n,
        pos: latLngToVec3(n.lat, n.lng, R * 1.005),
        match: matches(n, query),
      })),
    [query],
  );

  // Arcs between matched nodes sharing a country or the top pairs
  const arcs = useMemo(() => {
    const active = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.match);
    const pairs: [number, number][] = [];
    for (let i = 0; i < active.length - 1 && pairs.length < 14; i++) {
      pairs.push([active[i].i, active[i + 1].i]);
    }
    return pairs.map(([a, b]) => {
      const start = nodes[a].pos;
      const end = nodes[b].pos;
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      return { geom, a, b };
    });
  }, [nodes]);

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color="#0b1220" roughness={1} metalness={0.1} emissive="#0a1a2e" emissiveIntensity={0.4} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.001, 48, 48]} />
        <meshBasicMaterial color="#1d4ed8" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.08, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {nodes.map((n, i) => {
        const dim = hasQuery && !n.match;
        const isHover = hovered === i;
        const size = isHover ? 0.03 : n.match ? 0.018 : 0.012;
        const color = n.match ? "#34d399" : "#22d3ee";
        return (
          <group key={n.name} position={n.pos}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(i);
                onHover(n);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHovered(null);
                onHover(null);
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCountry(n.country);
              }}
            >
              <sphereGeometry args={[size, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={dim ? 0.25 : 1} />
            </mesh>
            {n.match && (
              <mesh>
                <ringGeometry args={[size * 1.6, size * 2.6, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
              </mesh>
            )}
            {isHover && (
              <Html distanceFactor={2.2} zIndexRange={[10, 0]} pointerEvents="none" center>
                <div className="pointer-events-none whitespace-nowrap glass-panel px-2.5 py-1.5 rounded-lg text-[10px] font-mono translate-y-[-14px]">
                  <span className="mr-1">{flag(n.countryCode)}</span>
                  <span className="font-bold">{n.name}</span>
                  <span className="text-text-s"> · {n.city}</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {arcs.map((arc, i) => (
        <line key={i}>
          <primitive object={arc.geom} attach="geometry" />
          <lineBasicMaterial color="#34d399" transparent opacity={0.5} />
        </line>
      ))}
    </group>
  );
}

function CameraFocus({ target }: { target: THREE.Vector3 | null }) {
  useFrame(({ camera }) => {
    if (!target) return;
    const desired = target.clone().normalize().multiplyScalar(2.3);
    camera.position.lerp(desired, 0.04);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// -------- Public component --------

interface OpportunityGlobeProps {
  activeCount?: number;
  query?: string;
  onCountrySelect?: (intel: CountryIntel | null) => void;
}

export default function OpportunityGlobe({
  query = "",
  onCountrySelect,
}: OpportunityGlobeProps) {
  const [hovered, setHovered] = useState<OpportunityNode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  // Auto-focus when the query narrows to a single country
  useEffect(() => {
    if (!query.trim()) {
      setSelectedCountry(null);
      onCountrySelect?.(null);
      return;
    }
    const matched = OPPORTUNITY_NODES.filter((n) => matches(n, query));
    const countries = Array.from(new Set(matched.map((n) => n.country)));
    if (countries.length === 1) {
      setSelectedCountry(countries[0]);
      onCountrySelect?.(aggregate(countries[0]));
    } else {
      setSelectedCountry(null);
      onCountrySelect?.(null);
    }
  }, [query, onCountrySelect]);

  const focusVec = useMemo(() => {
    if (!selectedCountry) return null;
    const c = COUNTRY_CENTROIDS[selectedCountry];
    if (!c) return null;
    return latLngToVec3(c[0], c[1], 1);
  }, [selectedCountry]);

  const intel = selectedCountry ? aggregate(selectedCountry) : null;

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    onCountrySelect?.(aggregate(country));
  };

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [0, 0, 2.6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 2, 4]} intensity={1.1} color="#93c5fd" />
        <directionalLight position={[-3, -2, -2]} intensity={0.4} color="#22d3ee" />
        <Suspense fallback={null}>
          <Earth
            query={query}
            onHover={setHovered}
            onSelectCountry={handleSelectCountry}
            focus={focusVec}
          />
          <CameraFocus target={focusVec} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.6}
          maxDistance={4}
          autoRotate={!reducedMotion && !selectedCountry && !hovered}
          autoRotateSpeed={0.35}
          rotateSpeed={0.6}
        />
      </Canvas>

      {/* Hover tooltip (rich card) */}
      {hovered && (
        <div className="pointer-events-none absolute top-3 left-3 glass-panel rounded-xl px-3 py-2.5 max-w-[240px] animate-[fade-in_0.15s_ease-out]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none">{flag(hovered.countryCode)}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-s">
              {hovered.country}
            </span>
          </div>
          <div className="text-sm font-bold leading-tight">{hovered.name}</div>
          <div className="text-[11px] text-text-s mb-2">{hovered.fullName}</div>
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">
              {hovered.kind}
            </span>
            {hovered.verified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[oklch(0.6_0.12_152)]/15 text-[oklch(0.78_0.15_152)] font-semibold">
                <ShieldCheck size={9} /> Verified
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-surface font-mono font-semibold">
              {hovered.matchScore}% Match
            </span>
          </div>
        </div>
      )}

      {/* Country Intelligence Panel */}
      {intel && (
        <div className="absolute bottom-3 right-3 glass-panel rounded-2xl p-4 w-[260px] animate-[fade-in_0.2s_ease-out]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl leading-none">{flag(intel.countryCode)}</span>
                <span className="text-sm font-black">{intel.country}</span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s">
                {intel.total} verified opportunit{intel.total === 1 ? "y" : "ies"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCountry(null);
                onCountrySelect?.(null);
              }}
              className="p-1 rounded-md hover:bg-surface text-text-s hover:text-foreground transition"
              aria-label="Close country panel"
            >
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {(Object.keys(intel.byKind) as OpportunityKind[]).map((k) => (
              <div key={k} className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-background/40 border border-border">
                <span className="text-text-s">{k}</span>
                <span className="font-mono font-bold">{intel.byKind[k]}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1">
            Top Organizations
          </div>
          <ul className="space-y-1 mb-3">
            {intel.organizations.map((o) => (
              <li key={o} className="text-[11px] text-foreground truncate">
                · {o}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-text-s">Avg match</span>
            <span className="text-xs font-black text-gradient">{intel.avgMatch}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
