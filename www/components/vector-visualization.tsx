'use client';

import type React from 'react';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { RefreshIcon, Rotate01Icon, DatabaseIcon, IcoIcon } from 'hugeicons-react';

interface VectorPoint {
    id: string;
    vector: number[];
    payload?: {
        product_id?: string;
        product_number?: string;
        product_name?: string;
        category_name?: string;
        subcategory_name?: string;
        description?: string;
        price?: number;
        currency?: string;
        url?: string;
        main_image_url?: string;
        main_image_alt?: string;
        rating_info?: any;
        quick_facts?: any[];
        variants?: any[];
        text?: string;
        [key: string]: any;
    };
}

interface PointDetails {
    point: VectorPoint;
    position: { x: number; y: number };
}

interface VectorVisualizationProps {
    collectionName?: string;
    maxPoints?: number;
}

const InteractiveParticleSystem: React.FC<{
    points: VectorPoint[];
    onPointClick: (point: VectorPoint, position: { x: number; y: number }) => void;
    hoveredPoint: number | null;
    setHoveredPoint: (index: number | null) => void;
}> = ({ points, onPointClick, hoveredPoint, setHoveredPoint }) => {
    const meshRef = useRef<THREE.Points>(null);
    const { camera, raycaster, mouse, gl } = useThree();

    const { positions, colors, sizes } = useMemo(() => {
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);
        const sizes = new Float32Array(points.length);

        const categoryMap = new Map<string, number>();
        let categoryIndex = 0;

        // Debug: Log categories
        const categories = [...new Set(points.map(p => p.payload?.name || 'unknown'))];
        console.log('Categories found:', categories);

        points.forEach((point, i) => {
            const i3 = i * 3;

            if (!point.payload) {
                return;
            }

            const _vector = point.vector || [];
            const radius = 69 + Math.random() * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            const category = point.payload.category_name || 'unknown';
            if (!categoryMap.has(category)) {
                categoryMap.set(category, categoryIndex++);
            }

            const categoryId = categoryMap.get(category)!;

            const hue = (categoryId * 137.5) % 360;
            const saturation = 1;
            const lightness = 0.5;
            const color = new THREE.Color().setHSL(hue / 360, saturation, lightness);

            if (i < 5) {
                console.log(`Point ${i}: category="${category}", hue=${hue}, color=`, color);
            }

            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            sizes[i] = 3.0 + Math.random() * 2.0;
        });

        return { positions, colors, sizes };
    }, [points]);

    const vertexShader = `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vSize;
    uniform float uTime;
    uniform float uHoveredIndex;
    
    void main() {
      vColor = color;
      vSize = size;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
      float pointSize = size * (400.0 / -mvPosition.z);
      
      if (uHoveredIndex >= 0.0) {
        pointSize *= 2.0;
      }
      
      gl_PointSize = pointSize;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

    const fragmentShader = `
    varying vec3 vColor;
    varying float vSize;
    uniform float uTime;
    uniform float uHoveredIndex;
    
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float distanceToCenter = length(center);
      
      if (distanceToCenter > 0.5) discard;
      
      // Sharp circular particles
      float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
      alpha = step(0.1, alpha); // Make edges sharp
      
      vec3 finalColor = vColor;
      
      if (uHoveredIndex >= 0.0) {
        alpha = 1.0;
        finalColor = mix(vColor, vec3(1.0), 0.3);
      }
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001;

            const material = meshRef.current.material as any;
            if (material.uniforms) {
                material.uniforms.uTime.value = state.clock.elapsedTime;
                material.uniforms.uHoveredIndex.value = hoveredPoint || -1;
            }
        }
    });

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();

        if (hoveredPoint !== null && hoveredPoint < points.length) {
            const point = points[hoveredPoint];
            const canvas = gl.domElement;
            const rect = canvas.getBoundingClientRect();
            onPointClick(point, {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            });
        }
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (meshRef.current) {
            const mouse = new THREE.Vector2();
            const canvas = gl.domElement;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObject(meshRef.current);
            if (intersects.length > 0) {
                const index = intersects[0].index;
                if (index !== undefined && index !== hoveredPoint) {
                    setHoveredPoint(index);
                }
            } else {
                setHoveredPoint(null);
            }
        }
    };

    return (
        <points
            ref={meshRef}
            onClick={handleClick}
            onPointerMove={handlePointerMove}
        >
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
                <bufferAttribute
                    attach="attributes-size"
                    args={[sizes, 1]}
                />
            </bufferGeometry>
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={false}
                depthWrite={true}
                uniforms={{
                    uTime: { value: 0 },
                    uHoveredIndex: { value: -1 }
                }}
            />
        </points>
    );
};

const StatsPanel: React.FC<{
    pointCount: number;
    loading: boolean;
    error: string | null;
}> = ({ pointCount, loading, error }) => {
    if (loading) {
        return (
            <div className="absolute top-4 left-4 w-64 bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Loading vectors...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="absolute top-4 left-4 w-64 bg-card border border-destructive rounded-lg p-4">
                <p className="text-destructive text-sm">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="absolute top-4 left-4 w-64 bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <DatabaseIcon className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Vector Database</h3>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Points</span>
                    <span className="text-sm font-medium bg-secondary px-2 py-1 rounded">{pointCount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Click points to explore details</p>
            </div>
        </div>
    );
};

const PointDetailsPanel: React.FC<{
    selectedPoint: PointDetails | null;
    onClose: () => void;
}> = ({ selectedPoint, onClose }) => {
    if (!selectedPoint) return null;

    const { point } = selectedPoint;

    return (
        <div
            className="absolute bg-card border rounded-lg p-4"
            style={{
                left: Math.min(selectedPoint.position.x + 20, window.innerWidth - 400),
                top: Math.min(selectedPoint.position.y - 20, window.innerHeight - 300)
            }}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <IcoIcon className="h-4 w-4" />
                    <h3 className="font-semibold text-sm">Point Details</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0"
                >
                    ×
                </Button>
            </div>

            <div className="flex gap-3">
                <div className="space-y-3 pr-16">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">ID</span>
                        <p className="font-mono text-xs break-all bg-muted p-2 rounded">{point.id}</p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Name</span>
                        <p className="font-medium">{point.payload?.product_name || 'Unknown'}</p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Description</span>
                        <p className="font-medium">{point.payload?.description || 'Unknown'}</p>
                    </div>


                    <div className="space-y-1 flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span>
                        <span className="bg-secondary w-max px-2 py-1 rounded text-xs capitalize">{point.payload?.category_name || 'unknown'}</span>
                    </div>

                    {point.payload?.price && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Price</span>
                            <p className="text-green-600 font-semibold">${point.payload.price}</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Rating</span>
                        <p className="text-primary font-semibold">{point.payload?.rating_info.rating || 'No rating'}/5 Stars</p>
                    </div>
                </div>
                <img src={point.payload?.main_image_url || ''} alt={point.payload?.main_image_alt || ''} className="w-full h-full max-w-64 object-cover rounded-lg" />
            </div>
        </div>
    );
};

const Controls: React.FC<{
    onRefresh: () => void;
    onResetView: () => void;
}> = ({ onRefresh, onResetView }) => {
    return (
        <div className="absolute top-4 right-4 w-48 bg-card border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Controls</h3>
            <div className="space-y-2">
                <Button
                    onClick={onRefresh}
                    variant="outline"
                    size="sm"
                    className="w-full"
                >
                    <RefreshIcon className="h-4 w-4 mr-2" />
                    Refresh Data
                </Button>
                <Button
                    onClick={onResetView}
                    variant="outline"
                    size="sm"
                    className="w-full"
                >
                    <Rotate01Icon className="h-4 w-4 mr-2" />
                    Reset View
                </Button>
            </div>
        </div>
    );
};

export const VectorVisualization: React.FC<VectorVisualizationProps> = ({
    collectionName = 'ikea_products',
    maxPoints = 1000
}) => {
    const [points, setPoints] = useState<VectorPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<PointDetails | null>(null);
    const controlsRef = useRef<any>(null);

    const fetchPoints = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/qdrant/points?collection=${collectionName}&limit=${maxPoints}&sample=true`);
            if (!response.ok) {
                throw new Error('Failed to fetch points');
            }

            const data = await response.json();
            setPoints(data.points || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            console.error('Error fetching points:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetView = () => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    };

    const handlePointClick = (point: VectorPoint, position: { x: number; y: number }) => {
        setSelectedPoint({ point, position });
    };

    const handleCloseDetails = () => {
        setSelectedPoint(null);
    };

    useEffect(() => {
        fetchPoints();
    }, [fetchPoints]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedPoint(null);
                setHoveredPoint(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="w-full h-screen bg-background relative">
            <Canvas
                camera={{ position: [0, 0, 50], fov: 60 }}
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance"
                }}
            >
                <fog attach="fog" args={['#000000', 50, 200]} />
                <ambientLight intensity={0.8} />
                <pointLight position={[20, 20, 20]} intensity={1.2} color="#ffffff" />
                <pointLight position={[-20, -20, -20]} intensity={0.8} color="#4a90e2" />
                <directionalLight position={[0, 10, 5]} intensity={0.7} />

                {!loading && !error && (
                    <InteractiveParticleSystem
                        points={points}
                        onPointClick={handlePointClick}
                        hoveredPoint={hoveredPoint}
                        setHoveredPoint={setHoveredPoint}
                    />
                )}

                <OrbitControls
                    ref={controlsRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={false}
                    maxDistance={300}
                    minDistance={20}
                    enableDamping={true}
                    dampingFactor={0.05}
                />

                <Stats />
            </Canvas>

            <StatsPanel
                pointCount={points.length}
                loading={loading}
                error={error}
            />

            <Controls
                onRefresh={fetchPoints}
                onResetView={resetView}
            />

            <PointDetailsPanel
                selectedPoint={selectedPoint}
                onClose={handleCloseDetails}
            />

            <div className="absolute bottom-4 left-4 max-w-2xl bg-card border rounded-lg p-4">
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Drag to rotate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Scroll to zoom</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Right-click to pan</span>
                    </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                    Hover over points • Click to explore • ESC to close
                </div>
            </div>
        </div>
    );
};
