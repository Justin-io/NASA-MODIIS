import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EarthAtmospherePreset,
  GlobeHotspotMarkerVisual,
  GlobeHotspotSensorFilter,
  IncidentRecord,
  PinnedCoordinateDraft,
} from '../shared/types';
import { MONITORED_REGIONS, MonitoredRegion } from '../shared/dataAdapter';
import {
  cartesianToLatLng,
  computeHotspotMarkerVisuals,
  computeTslEarthSolarState,
  createPinnedIncidentRecord,
  inferPinnedSectorContext,
} from '../shared/intelligenceEngine';

interface EarthGlobe3DProps {
  incidents: IncidentRecord[];
  selectedRegion: MonitoredRegion;
  onSelectRegion: (region: MonitoredRegion) => void;
  onSelectIncident: (incidentId: string) => void;
  onSwitchTo2DMap: () => void;
  onCreatePinnedIncident?: (
    newIncident: IncidentRecord,
    navigateToIntelligence?: boolean
  ) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

interface LiveAircraftMarker {
  icao24: string;
  callsign: string | null;
  lat: number;
  lng: number;
  altitudeM: number | null;
  velocityMs: number | null;
  trackDeg: number | null;
  onGround: boolean;
  lastContact: number;
}

const ATMOSPHERE_PRESETS: EarthAtmospherePreset[] = [
  {
    id: 'tsl_classic',
    label: 'TSL Earth (#4db2ff / #bc4700)',
    dayColorHex: '#4db2ff',
    twilightColorHex: '#bc4700',
  },
  {
    id: 'solar_flare',
    label: 'Solar Flare (#38bdf8 / #e11d48)',
    dayColorHex: '#38bdf8',
    twilightColorHex: '#e11d48',
  },
  {
    id: 'cryo_mesosphere',
    label: 'Mesosphere (#60a5fa / #d97706)',
    dayColorHex: '#60a5fa',
    twilightColorHex: '#d97706',
  },
];

const IS_SOFTWARE_GL = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

function latLngToVec3(
  lat: number,
  lng: number,
  radius: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  out.x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  out.z = z;
  out.y = y;
  return out;
}

/**
 * Loads authentic NASA 4K Blue Marble & Black Marble high-definition textures
 * with fallback to local 2K planetary maps:
 * 1) dayTexture (4096x2048 sRGB): True satellite Blue Marble day view
 * 2) nightTexture (4096x2048 sRGB): NASA Black Marble nocturnal city lights
 * 3) bumpRoughnessCloudsTexture (4096x2048 Linear): R=Elevation, G=Roughness, B=Clouds
 * 4) cloudsTexture (1024x512): High-resolution cloud sphere with alpha channel
 */
function createTslEarthTextures(maxAnisotropy = 4): {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  bumpRoughnessCloudsTexture: THREE.Texture;
  cloudsTexture: THREE.Texture;
} {
  const loader = new THREE.TextureLoader();

  const dayTexture = loader.load(
    '/textures/planets/earth_day_4096.jpg',
    undefined,
    undefined,
    () => loader.load('/textures/planets/earth_atmos_2048.jpg')
  );
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  dayTexture.anisotropy = maxAnisotropy;
  dayTexture.wrapS = THREE.RepeatWrapping;
  dayTexture.wrapT = THREE.ClampToEdgeWrapping;

  const nightTexture = loader.load(
    '/textures/planets/earth_night_4096.jpg',
    undefined,
    undefined,
    () => loader.load('/textures/planets/earth_lights_2048.png')
  );
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.anisotropy = maxAnisotropy;
  nightTexture.wrapS = THREE.RepeatWrapping;
  nightTexture.wrapT = THREE.ClampToEdgeWrapping;

  const bumpRoughnessCloudsTexture = loader.load(
    '/textures/planets/earth_bump_roughness_clouds_4096.jpg'
  );
  bumpRoughnessCloudsTexture.colorSpace = THREE.NoColorSpace;
  bumpRoughnessCloudsTexture.anisotropy = maxAnisotropy;
  bumpRoughnessCloudsTexture.wrapS = THREE.RepeatWrapping;
  bumpRoughnessCloudsTexture.wrapT = THREE.ClampToEdgeWrapping;

  const cloudsTexture = loader.load('/textures/planets/earth_clouds_1024.png');
  cloudsTexture.wrapS = THREE.RepeatWrapping;
  cloudsTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { dayTexture, nightTexture, bumpRoughnessCloudsTexture, cloudsTexture };
}

const EARTH_SURFACE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec3 vTangentWorld;
  varying vec3 vBitangentWorld;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPositionWorld = worldPos.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);

    vec3 up = abs(vNormalWorld.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vTangentWorld = normalize(cross(up, vNormalWorld));
    vBitangentWorld = normalize(cross(vNormalWorld, vTangentWorld));

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const EARTH_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform sampler2D uBumpRoughnessCloudsTexture;
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereDayColor;
  uniform vec3 uAtmosphereTwilightColor;
  uniform float uCloudOffset;
  uniform float uCloudsVisible;
  uniform float uCityLightsIntensity;
  uniform float uBumpStrength;

  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec3 vTangentWorld;
  varying vec3 vBitangentWorld;

  void main() {
    vec3 viewDirection = normalize(vPositionWorld - cameraPosition);
    vec3 normal = normalize(vNormalWorld);
    vec3 sunDir = normalize(uSunDirection);

    vec3 brcBase = texture2D(uBumpRoughnessCloudsTexture, vUv).rgb;
    vec2 cloudUv = vec2(fract(vUv.x + uCloudOffset), vUv.y);
    float rawClouds = texture2D(uBumpRoughnessCloudsTexture, cloudUv).b * uCloudsVisible;
    float cloudsStrength = smoothstep(0.14, 0.95, rawClouds);

    vec2 texel = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    float hCenter = max(brcBase.r, cloudsStrength * 0.35);
    float hRight = max(
      texture2D(uBumpRoughnessCloudsTexture, vUv + vec2(texel.x, 0.0)).r,
      smoothstep(0.14, 0.95, texture2D(uBumpRoughnessCloudsTexture, cloudUv + vec2(texel.x, 0.0)).b * uCloudsVisible) * 0.35
    );
    float hUp = max(
      texture2D(uBumpRoughnessCloudsTexture, vUv + vec2(0.0, texel.y)).r,
      smoothstep(0.14, 0.95, texture2D(uBumpRoughnessCloudsTexture, cloudUv + vec2(0.0, texel.y)).b * uCloudsVisible) * 0.35
    );

    float dHx = (hRight - hCenter) * uBumpStrength * 3.4;
    float dHy = (hUp - hCenter) * uBumpStrength * 3.4;
    vec3 perturbedNormal = normalize(normal - dHx * normalize(vTangentWorld) - dHy * normalize(vBitangentWorld));

    float sunOrientation = dot(perturbedNormal, sunDir);
    float smoothOrientation = dot(normal, sunDir);
    float dayStrength = smoothstep(-0.25, 0.5, sunOrientation);

    float atmosphereDayStrength = smoothstep(-0.25, 0.75, smoothOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayStrength);

    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

    vec2 shadowUv = fract(cloudUv - vec2(sunDir.x, -sunDir.y) * 0.0045);
    float cloudShadow = smoothstep(0.2, 0.9, texture2D(uBumpRoughnessCloudsTexture, shadowUv).b * uCloudsVisible);
    dayColor *= (1.0 - cloudShadow * 0.32 * dayStrength);

    float nightMask = pow(1.0 - smoothstep(-0.15, 0.25, smoothOrientation), 1.35);
    vec3 glowingNight = nightColor * uCityLightsIntensity * nightMask * (1.0 - cloudsStrength * 0.65) * vec3(1.15, 0.98, 0.78);

    vec3 surfaceColor = mix(vec3(0.015, 0.028, 0.065), dayColor, dayStrength) + glowingNight;

    vec3 cloudColor = mix(atmosphereColor * 0.45 + vec3(0.08), vec3(0.98, 0.99, 1.0), max(0.08, dayStrength));
    surfaceColor = mix(surfaceColor, cloudColor, cloudsStrength * 0.88);

    float fresnel = clamp(1.0 + dot(viewDirection, normal), 0.0, 1.0);
    float atmosphereMix = pow(fresnel, 2.8) * smoothstep(-0.35, 0.45, smoothOrientation) * 0.72;
    surfaceColor = mix(surfaceColor, atmosphereColor, atmosphereMix);

    float roughness = clamp(max(brcBase.g, step(0.01, cloudsStrength) * 0.55), 0.14, 0.95);
    vec3 reflection = reflect(-sunDir, perturbedNormal);
    float specularRaw = max(0.0, -dot(viewDirection, reflection));
    float shininess = mix(42.0, 6.0, roughness);
    float specular = pow(specularRaw, shininess) * (1.0 - roughness * 0.85) * dayStrength * 1.25;
    vec3 specularColor = mix(vec3(1.0, 0.98, 0.94), atmosphereColor, pow(fresnel, 1.8));
    surfaceColor += specularColor * specular * 0.85;

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

const ATMOSPHERE_HALO_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPositionWorld = worldPos.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ATMOSPHERE_HALO_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereDayColor;
  uniform vec3 uAtmosphereTwilightColor;

  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;

  void main() {
    vec3 viewDirection = normalize(vPositionWorld - cameraPosition);
    vec3 normal = normalize(vNormalWorld);
    vec3 sunDir = normalize(uSunDirection);

    float edgeAlpha = dot(viewDirection, normal);
    edgeAlpha = smoothstep(0.0, 0.52, edgeAlpha);

    float sunOrientation = dot(normal, sunDir);
    float dayAlpha = smoothstep(-0.5, 0.65, sunOrientation);
    float twilightMix = smoothstep(-0.25, 0.75, sunOrientation);

    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, twilightMix);
    float alpha = edgeAlpha * dayAlpha * 0.88;

    gl_FragColor = vec4(atmosphereColor, alpha);
  }
`;

const SoftwareWebGLPacer: React.FC<{ active: boolean }> = ({ active }) => {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (!IS_SOFTWARE_GL || !active) return;
    let timerId = 0;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const rawGl = gl.getContext() as WebGL2RenderingContext;
      if (!rawGl || !rawGl.fenceSync) {
        timerId = window.setTimeout(() => {
          invalidate();
          scheduleNext();
        }, 90);
        return;
      }
      const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      rawGl.flush();
      const poll = () => {
        if (cancelled) return;
        if (!sync) {
          timerId = window.setTimeout(() => {
            invalidate();
            scheduleNext();
          }, 80);
          return;
        }
        const status = rawGl.getSyncParameter(sync, rawGl.SYNC_STATUS);
        if (status === rawGl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 6);
        } else {
          rawGl.deleteSync(sync);
          timerId = window.setTimeout(() => {
            invalidate();
            scheduleNext();
          }, 80);
        }
      };
      timerId = window.setTimeout(poll, 6);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [gl, invalidate, active]);

  return null;
};

const OrbitalSatelliteMesh: React.FC<{
  orbitRadius: number;
  inclinationRad: number;
  ascNodeRad: number;
  speed: number;
  phaseOffset: number;
  wingColor: number;
}> = ({
  orbitRadius,
  inclinationRad,
  ascNodeRad,
  speed,
  phaseOffset,
  wingColor,
}) => {
  const satGroupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(phaseOffset);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    elapsedRef.current += dt * speed;
    const angle = elapsedRef.current;
    if (satGroupRef.current) {
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius * Math.sin(inclinationRad);
      const z = Math.sin(angle) * orbitRadius * Math.cos(inclinationRad);
      satGroupRef.current.position.set(x, y, z);
      satGroupRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group rotation={[0, ascNodeRad, 0]}>
      <mesh rotation={[Math.PI / 2 - inclinationRad, 0, 0]}>
        <torusGeometry args={[orbitRadius, 0.0038, 8, 96]} />
        <meshBasicMaterial color={wingColor} transparent opacity={0.38} />
      </mesh>

      <group ref={satGroupRef} position={[orbitRadius, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.12, 8]} />
          <meshStandardMaterial color={0xe2e8f0} metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.008, 0.32, 0.085]} />
          <meshStandardMaterial color={wingColor} metalness={0.45} roughness={0.18} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.008, 0.32, 0.085]} />
          <meshStandardMaterial color={wingColor} metalness={0.45} roughness={0.18} />
        </mesh>
        <mesh position={[0.068, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.036, 0.042, 0.028, 8]} />
          <meshStandardMaterial color={0xf59e0b} metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, -0.048]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.024, 0.05, 12]} />
          <meshStandardMaterial color={0x334155} metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh position={[-0.048, 0, 0.05]}>
          <coneGeometry args={[0.03, 0.024, 12, 1, true]} />
          <meshStandardMaterial
            color={0xf8fafc}
            metalness={0.6}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

interface TslEarthSceneProps {
  aircraft: LiveAircraftMarker[];
  hotspotMarkers: GlobeHotspotMarkerVisual[];
  selectedHotspotId: string | null;
  onSelectHotspot: (marker: GlobeHotspotMarkerVisual) => void;
  pinnedDraft: PinnedCoordinateDraft;
  clickToPinMode: boolean;
  onSurfacePinCoordinate: (lat: number, lng: number) => void;
  sunPhi: number;
  sunTheta: number;
  atmospherePreset: EarthAtmospherePreset;
  cloudsVisible: boolean;
  orbitPassVisible: boolean;
  autoRotateGlobe: boolean;
  targetRotationY: number;
  targetRotationX: number;
  targetCameraZ: number;
  onDragRotate: (ny: number, nx: number) => void;
}

const TslEarthScene: React.FC<TslEarthSceneProps> = ({
  aircraft,
  hotspotMarkers,
  selectedHotspotId,
  onSelectHotspot,
  pinnedDraft,
  clickToPinMode,
  onSurfacePinCoordinate,
  sunPhi,
  sunTheta,
  atmospherePreset,
  cloudsVisible,
  orbitPassVisible,
  autoRotateGlobe,
  targetRotationY,
  targetRotationX,
  targetCameraZ,
  onDragRotate,
}) => {
  const { gl, camera, invalidate } = useThree();
  const globeGroupRef = useRef<THREE.Group>(null);
  const surfaceMatRef = useRef<THREE.ShaderMaterial>(null);
  const atmoMatRef = useRef<THREE.ShaderMaterial>(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const localRotYRef = useRef(targetRotationY);
  const localRotXRef = useRef(targetRotationX);

  useEffect(() => {
    localRotYRef.current = targetRotationY;
    localRotXRef.current = targetRotationX;
    invalidate();
  }, [targetRotationY, targetRotationX, invalidate]);

  const maxAniso = useMemo(
    () => gl.capabilities.getMaxAnisotropy() || 4,
    [gl]
  );
  // 128 segments remove the visible faceting at the closer camera distance;
  // software renderers retain the lighter mesh for responsive interaction.
  const earthSegments = IS_SOFTWARE_GL ? 64 : 128;

  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const { dayTexture, nightTexture, bumpRoughnessCloudsTexture, cloudsTexture } = useMemo(
    () => createTslEarthTextures(maxAniso),
    [maxAniso]
  );

  useEffect(() => {
    return () => {
      dayTexture.dispose();
      nightTexture.dispose();
      bumpRoughnessCloudsTexture.dispose();
      cloudsTexture.dispose();
    };
  }, [dayTexture, nightTexture, bumpRoughnessCloudsTexture, cloudsTexture]);

  const sunDirectionVec = useMemo(() => {
    const spherical = new THREE.Spherical(1, sunPhi, sunTheta);
    return new THREE.Vector3().setFromSpherical(spherical).normalize();
  }, [sunPhi, sunTheta]);

  const surfaceUniforms = useMemo(
    () => ({
      uDayTexture: { value: dayTexture },
      uNightTexture: { value: nightTexture },
      uBumpRoughnessCloudsTexture: { value: bumpRoughnessCloudsTexture },
      uSunDirection: { value: new THREE.Vector3(0.75, 0.1, 0.65).normalize() },
      uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
      uAtmosphereTwilightColor: { value: new THREE.Color('#bc4700') },
      uCloudOffset: { value: 0 },
      uCloudsVisible: { value: 1.0 },
      uCityLightsIntensity: { value: 1.85 },
      uBumpStrength: { value: 1.0 },
    }),
    [dayTexture, nightTexture, bumpRoughnessCloudsTexture]
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: new THREE.Vector3(0.75, 0.1, 0.65).normalize() },
      uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
      uAtmosphereTwilightColor: { value: new THREE.Color('#bc4700') },
    }),
    []
  );

  useEffect(() => {
    if (surfaceMatRef.current) {
      surfaceMatRef.current.uniforms.uSunDirection.value.copy(sunDirectionVec);
      surfaceMatRef.current.uniforms.uAtmosphereDayColor.value.set(
        atmospherePreset.dayColorHex
      );
      surfaceMatRef.current.uniforms.uAtmosphereTwilightColor.value.set(
        atmospherePreset.twilightColorHex
      );
      surfaceMatRef.current.uniforms.uCloudsVisible.value = cloudsVisible
        ? 1.0
        : 0.0;
    }
    if (atmoMatRef.current) {
      atmoMatRef.current.uniforms.uSunDirection.value.copy(sunDirectionVec);
      atmoMatRef.current.uniforms.uAtmosphereDayColor.value.set(
        atmospherePreset.dayColorHex
      );
      atmoMatRef.current.uniforms.uAtmosphereTwilightColor.value.set(
        atmospherePreset.twilightColorHex
      );
    }
    invalidate();
  }, [sunDirectionVec, atmospherePreset, cloudsVisible, invalidate]);

  const starGeo = useMemo(() => {
    const count = IS_SOFTWARE_GL ? 900 : 1600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = ((i * 73856093) % 10000) / 10000;
      const v = ((i * 19349663) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 24 + (i % 7) * 2.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const b = 0.55 + (i % 5) * 0.1;
      colors[i * 3] = b * 0.92;
      colors[i * 3 + 1] = b * 0.96;
      colors[i * 3 + 2] = b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      starGeo.dispose();
    };
  }, [starGeo]);

  useEffect(() => {
    const dom = gl.domElement;
    const handleDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevPointerRef.current.x;
      const dy = e.clientY - prevPointerRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
      localRotYRef.current += dx * 0.0065;
      localRotXRef.current = THREE.MathUtils.clamp(
        localRotXRef.current + dy * 0.0055,
        -0.95,
        0.95
      );
      onDragRotate(localRotYRef.current, localRotXRef.current);
      invalidate();
    };
    const handleUp = () => {
      isDraggingRef.current = false;
    };

    dom.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      dom.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [gl, onDragRotate, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (autoRotateGlobe && !isDraggingRef.current && !clickToPinMode) {
      localRotYRef.current += dt * 0.055;
    }
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y = THREE.MathUtils.damp(
        globeGroupRef.current.rotation.y,
        localRotYRef.current,
        5.5,
        dt
      );
      globeGroupRef.current.rotation.x = THREE.MathUtils.damp(
        globeGroupRef.current.rotation.x,
        localRotXRef.current,
        5.5,
        dt
      );
    }
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      targetCameraZ,
      4.5,
      dt
    );
    if (surfaceMatRef.current && cloudsVisible) {
      surfaceMatRef.current.uniforms.uCloudOffset.value =
        (surfaceMatRef.current.uniforms.uCloudOffset.value + dt * 0.0045) % 1.0;
    }
    if (cloudMeshRef.current && cloudsVisible) {
      cloudMeshRef.current.rotation.y += dt * 0.022;
    }
  });

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Pinned 3D Coordinate Beacon position & orientation
  const pinnedPos = useMemo(
    () => latLngToVec3(pinnedDraft.lat, pinnedDraft.lng, 1.425),
    [pinnedDraft.lat, pinnedDraft.lng]
  );
  const pinnedQuat = useMemo(() => {
    const n = pinnedPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(upVec, n);
  }, [pinnedPos, upVec]);

  return (
    <>
      <color attach="background" args={['#030712']} />

      <hemisphereLight args={[0xbae6fd, 0x0f172a, 0.95]} />
      <directionalLight
        position={[
          sunDirectionVec.x * 8,
          sunDirectionVec.y * 8,
          sunDirectionVec.z * 8,
        ]}
        intensity={2.2}
        color={0xfffbeb}
      />

      {/* Deep Space Starfield */}
      <points geometry={starGeo}>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* Distant Solar Flare Indicator Sphere */}
      <group
        position={[
          sunDirectionVec.x * 14,
          sunDirectionVec.y * 14,
          sunDirectionVec.z * 14,
        ]}
      >
        <mesh>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshBasicMaterial color={0xfffbeb} />
        </mesh>
        <mesh scale={1.8}>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshBasicMaterial
            color={atmospherePreset.twilightColorHex}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Main Rotatable Scientific Earth Group */}
      <group ref={globeGroupRef}>
        {/* 1. Primary TSL Earth Surface Sphere with Raycast Click-to-Pin Handler */}
        <mesh
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (dragDistanceRef.current > 6) return;
            e.stopPropagation();
            const localPt = e.object.worldToLocal(e.point.clone());
            const coords = cartesianToLatLng(localPt.x, localPt.y, localPt.z);
            onSurfacePinCoordinate(coords.lat, coords.lng);
            invalidate();
          }}
        >
          <sphereGeometry args={[1.42, earthSegments, earthSegments]} />
          <shaderMaterial
            ref={surfaceMatRef}
            vertexShader={EARTH_SURFACE_VERTEX_SHADER}
            fragmentShader={EARTH_SURFACE_FRAGMENT_SHADER}
            uniforms={surfaceUniforms}
          />
        </mesh>

        {/* 2. Volumetric Tropospheric Cloud Sphere (Parallax & Depth) */}
        {cloudsVisible && (
          <mesh ref={cloudMeshRef} scale={1.014}>
            <sphereGeometry args={[1.42, earthSegments, earthSegments]} />
            <meshStandardMaterial
              map={cloudsTexture}
              transparent
              opacity={0.56}
              blending={THREE.NormalBlending}
              depthWrite={false}
              roughness={0.92}
              metalness={0.0}
            />
          </mesh>
        )}

        {/* 3. Outer BackSide Atmospheric Corona Limb */}
        <mesh scale={1.055}>
          <sphereGeometry args={[1.42, earthSegments, earthSegments]} />
          <shaderMaterial
            ref={atmoMatRef}
            vertexShader={ATMOSPHERE_HALO_VERTEX_SHADER}
            fragmentShader={ATMOSPHERE_HALO_FRAGMENT_SHADER}
            uniforms={atmosphereUniforms}
            side={THREE.BackSide}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 3. Real-Time NASA MODIS & VIIRS Hotspots Overlay with Intensity-Based Scaling */}
        {hotspotMarkers.map((marker) => {
          const pos = latLngToVec3(marker.lat, marker.lng, 1.424);
          const normal = pos.clone().normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(upVec, normal);
          const isSelected = marker.id === selectedHotspotId;
          const h = marker.pillarHeight;
          const r = marker.footprintRadius;

          return (
            <group
              key={marker.id}
              position={[pos.x, pos.y, pos.z]}
              quaternion={quat}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelectHotspot(marker);
                invalidate();
              }}
            >
              {/* Intensity-Scaled Thermal Footprint Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
                <ringGeometry args={[r * 0.52, r * (isSelected ? 1.35 : 1.0), 20]} />
                <meshBasicMaterial
                  color={isSelected ? '#38bdf8' : marker.colorHex}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={isSelected ? 0.95 : 0.8}
                />
              </mesh>

              {/* Intensity-Scaled Radiometric FRP Column (Height proportional to FRP MW & Kelvin) */}
              <mesh position={[0, h / 2, 0]}>
                <cylinderGeometry args={[r * 0.28, r * 0.46, h, 12]} />
                <meshStandardMaterial
                  color={marker.colorHex}
                  emissive={marker.colorHex}
                  emissiveIntensity={isSelected ? 1.25 : 0.88}
                  roughness={0.2}
                />
              </mesh>

              {/* Sensor Family Differentiator Crown (VIIRS 375m Diamond vs MODIS 1km Sphere) */}
              <mesh position={[0, h + 0.014, 0]}>
                {marker.sensorFamily === 'VIIRS' ? (
                  <octahedronGeometry args={[r * 0.42, 0]} />
                ) : (
                  <sphereGeometry args={[r * 0.38, 12, 12]} />
                )}
                <meshBasicMaterial
                  color={isSelected ? '#38bdf8' : '#fffbeb'}
                />
              </mesh>
            </group>
          );
        })}

        {/* Live OpenSky ADS-B positions; only current feed observations are rendered. */}
        {aircraft.map((plane) => {
          const pos = latLngToVec3(plane.lat, plane.lng, 1.432);
          const normal = pos.clone().normalize();
          const quaternion = new THREE.Quaternion().setFromUnitVectors(upVec, normal);
          return (
            <group key={plane.icao24} position={[pos.x, pos.y, pos.z]} quaternion={quaternion}>
              <mesh>
                <octahedronGeometry args={[0.018, 0]} />
                <meshBasicMaterial color={plane.onGround ? '#fbbf24' : '#38bdf8'} />
              </mesh>
              <mesh position={[0, 0.028, 0]}>
                <coneGeometry args={[0.009, 0.035, 5]} />
                <meshBasicMaterial color={plane.onGround ? '#fbbf24' : '#bae6fd'} />
              </mesh>
            </group>
          );
        })}

        {/* 4. Operator Click-to-Pin 3D Target Reticle & Laser Beacon */}
        <group
          position={[pinnedPos.x, pinnedPos.y, pinnedPos.z]}
          quaternion={pinnedQuat}
        >
          {/* Outer Emerald-Cyan Target Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[0.042, 0.064, 28]} />
            <meshBasicMaterial
              color={0x10b981}
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Inner Crosshair Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
            <ringGeometry args={[0.014, 0.024, 24]} />
            <meshBasicMaterial
              color={0x38bdf8}
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Vertical Pin Laser Beacon */}
          <mesh position={[0, 0.095, 0]}>
            <cylinderGeometry args={[0.007, 0.014, 0.19, 12]} />
            <meshStandardMaterial
              color={0x10b981}
              emissive={0x34d399}
              emissiveIntensity={1.1}
              roughness={0.15}
            />
          </mesh>
          {/* Top Pin Beacon Head */}
          <mesh position={[0, 0.2, 0]}>
            <octahedronGeometry args={[0.028, 0]} />
            <meshBasicMaterial color={0x6ee7b7} />
          </mesh>
        </group>

        {/* 5. Polar Sun-Synchronous Satellite Orbits */}
        {orbitPassVisible && (
          <group>
            <OrbitalSatelliteMesh
              orbitRadius={1.74}
              inclinationRad={Math.PI / 2.25}
              ascNodeRad={0.42}
              speed={0.42}
              phaseOffset={0.3}
              wingColor={0x38bdf8}
            />
            <OrbitalSatelliteMesh
              orbitRadius={1.86}
              inclinationRad={Math.PI / 1.75}
              ascNodeRad={-0.55}
              speed={-0.34}
              phaseOffset={2.1}
              wingColor={0x818cf8}
            />
          </group>
        )}
      </group>
    </>
  );
};

export const EarthGlobe3D: React.FC<EarthGlobe3DProps> = ({
  incidents,
  selectedRegion,
  onSelectRegion,
  onSelectIncident,
  onSwitchTo2DMap,
  onCreatePinnedIncident,
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // The globe is a visual investigation surface first. Advanced controls stay
  // out of the sightline until an analyst explicitly opens them.
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [orbitPassVisible, setOrbitPassVisible] = useState(false);
  const [cloudsVisible, setCloudsVisible] = useState(true);
  const [autoRotateGlobe, setAutoRotateGlobe] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<
    'global' | 'nilgiri' | 'sierra' | 'arcadia'
  >('nilgiri');

  // NASA MODIS/VIIRS Real-Time Hotspot Overlay Controls
  const [sensorFilter, setSensorFilter] =
    useState<GlobeHotspotSensorFilter>('ALL');
  const [intensityScaleMultiplier, setIntensityScaleMultiplier] =
    useState<number>(1.25);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    incidents[0]?.observations[0]?.id || null
  );

  // Click-to-Pin 3D Coordinate & Incident Creation State
  const [clickToPinMode, setClickToPinMode] = useState<boolean>(false);
  const [pinnedDraft, setPinnedDraft] = useState<PinnedCoordinateDraft>(() =>
    inferPinnedSectorContext(11.4582, 76.6624)
  );
  const [lastCreatedPinId, setLastCreatedPinId] = useState<string | null>(null);

  // Spherical Sun coordinates (matching threejs.org/examples/webgpu_tsl_earth.html)
  const [sunPhi, setSunPhi] = useState<number>(1.52);
  const [sunTheta, setSunTheta] = useState<number>(0.68);
  const [atmospherePresetId, setAtmospherePresetId] =
    useState<EarthAtmospherePreset['id']>('tsl_classic');

  // Frame the full atmosphere shell inside the 16:9 viewport; the prior close
  // camera clipped the globe at the top and bottom on wide displays.
  const [globeRot, setGlobeRot] = useState({ y: -2.92, x: 0.2, camZ: 5.0 });
  const [aircraft, setAircraft] = useState<LiveAircraftMarker[]>([]);
  const [aircraftFeed, setAircraftFeed] = useState<'loading' | 'live' | 'unavailable'>('loading');

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      const boxes: Record<string, [number, number, number, number]> = {
        'REG-NILGIRI': [11.0, 76.0, 12.5, 77.5], 'REG-SIERRA': [36.0, -121.0, 39.0, -118.0],
        'REG-ARCADIA': [37.0, -8.5, 42.0, -6.0], 'REG-PANTANAL': [-21.0, -58.5, -16.0, -54.0],
      };
      const [latMin, lngMin, latMax, lngMax] = boxes[selectedRegion.id] || boxes['REG-NILGIRI'];
      try {
        const response = await fetch(`/api/aircraft/bbox?latMin=${latMin}&lngMin=${lngMin}&latMax=${latMax}&lngMax=${lngMax}`);
        if (!response.ok) throw new Error(`OpenSky feed HTTP ${response.status}`);
        const payload = await response.json();
        if (disposed) return;
        const nowSeconds = Date.now() / 1000;
        setAircraft((payload.aircraft || []).filter((p: LiveAircraftMarker) => p.lat != null && p.lng != null && nowSeconds - p.lastContact < 180));
        setAircraftFeed('live');
      } catch {
        if (!disposed) { setAircraft([]); setAircraftFeed('unavailable'); }
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 90_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [selectedRegion.id]);

  const activeAtmoPreset = useMemo(
    () =>
      ATMOSPHERE_PRESETS.find((p) => p.id === atmospherePresetId) ||
      ATMOSPHERE_PRESETS[0],
    [atmospherePresetId]
  );

  useEffect(() => {
    if (cameraPreset === 'nilgiri') {
      setGlobeRot({ y: -2.92, x: 0.2, camZ: 5.0 });
    } else if (cameraPreset === 'sierra') {
      setGlobeRot({ y: 0.55, x: 0.65, camZ: 5.0 });
    } else if (cameraPreset === 'arcadia') {
      setGlobeRot({ y: -1.95, x: 0.62, camZ: 5.0 });
    } else {
      setGlobeRot((prev) => ({ ...prev, camZ: 5.45 }));
    }
  }, [cameraPreset]);

  const solarState = useMemo(
    () =>
      computeTslEarthSolarState({
        sunPhiRad: sunPhi,
        sunThetaRad: sunTheta,
        globeRotationYRad: globeRot.y,
        globeRotationXRad: globeRot.x,
        regionLatDeg: selectedRegion?.center?.lat ?? 11.4064,
        regionLngDeg: selectedRegion?.center?.lng ?? 76.6932,
      }),
    [sunPhi, sunTheta, globeRot.y, globeRot.x, selectedRegion]
  );

  const hotspotOverlay = useMemo(
    () =>
      computeHotspotMarkerVisuals(
        incidents,
        sensorFilter,
        intensityScaleMultiplier
      ),
    [incidents, sensorFilter, intensityScaleMultiplier]
  );

  const activeHotspot = useMemo(
    () =>
      hotspotOverlay.markers.find((m) => m.id === selectedHotspotId) ||
      hotspotOverlay.markers[0] ||
      null,
    [hotspotOverlay.markers, selectedHotspotId]
  );

  const handlePinCoordinate = (lat: number, lng: number) => {
    const draft = inferPinnedSectorContext(lat, lng);
    setPinnedDraft(draft);
  };

  const handleGenerateIncidentFromPin = (navigateToIntelligence: boolean) => {
    const newRecord = createPinnedIncidentRecord(pinnedDraft, incidents.length);
    setLastCreatedPinId(newRecord.id);
    if (onCreatePinnedIncident) {
      onCreatePinnedIncident(newRecord, navigateToIntelligence);
    } else {
      onSelectIncident(newRecord.id);
    }
  };

  return (
    <div
      data-testid="r3f-tsl-earth-workspace"
      data-fullscreen={isFullScreen ? 'true' : 'false'}
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#030712] overflow-hidden'
          : 'relative w-full h-[480px] sm:h-auto sm:aspect-[16/9] sm:min-h-[560px] lg:min-h-[640px] bg-[#030712] border border-slate-800/90 rounded-2xl overflow-hidden shadow-[0_18px_48px_rgba(2,6,23,0.32)]'
      }
    >
      {/* Dedicated React Three Fiber WebGL Mount Container */}
      <div
        data-testid="earth-globe-canvas"
        className={`w-full h-full ${
          clickToPinMode
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <Canvas
          frameloop="always"
          dpr={IS_SOFTWARE_GL ? 1 : [1, 2]}
          camera={{ position: [0, 0.08, 5.0], fov: 38, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
        >
          {/* Direct 60 FPS WebGL */} 
          <TslEarthScene
            aircraft={aircraft}
            hotspotMarkers={hotspotOverlay.markers}
            selectedHotspotId={activeHotspot?.id || null}
            onSelectHotspot={(marker) => {
              setSelectedHotspotId(marker.id);
              onSelectIncident(marker.incidentId);
            }}
            pinnedDraft={pinnedDraft}
            clickToPinMode={clickToPinMode}
            onSurfacePinCoordinate={handlePinCoordinate}
            sunPhi={sunPhi}
            sunTheta={sunTheta}
            atmospherePreset={activeAtmoPreset}
            cloudsVisible={cloudsVisible}
            orbitPassVisible={orbitPassVisible}
            autoRotateGlobe={autoRotateGlobe}
            targetRotationY={globeRot.y}
            targetRotationX={globeRot.x}
            targetCameraZ={globeRot.camZ}
            onDragRotate={(ny, nx) =>
              setGlobeRot((prev) => ({ ...prev, y: ny, x: nx }))
            }
          />
        </Canvas>
      </div>

      {/* Compact header: preserve the globe sightline and move detailed tools into the dock. */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
        <div
          data-testid="globe-firms-telemetry-badge"
          className="pointer-events-auto bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-white shadow-lg max-w-[min(72%,680px)]"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono font-semibold tracking-tight text-sky-400">
            <span>● NASA FIRMS OVERLAY</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-200 truncate">
              {selectedRegion.name}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-300">{hotspotOverlay.totalCount} source detections</span>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-400 mt-0.5">
            <span>Illumination: <strong className="text-slate-200">{solarState.illuminationPhase}</strong></span>
            <span>·</span>
            <span className={aircraftFeed === 'live' ? 'text-cyan-300' : 'text-amber-300'}>
              ADS-B {aircraftFeed === 'live' ? `LIVE · ${aircraft.length} aircraft` : aircraftFeed === 'loading' ? 'LOADING' : 'UNAVAILABLE'}
            </span>
            {activeHotspot && (
              <>
                <span>·</span>
                <span className="text-emerald-300">
                  Selected: {activeHotspot.sensor} · {activeHotspot.frpMw} MW
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Right Action Buttons (Full-Screen Toggle + 2D Operational View Switch) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              data-testid="globe-header-fullscreen-toggle"
              className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/15 text-white hover:bg-slate-800 shadow-sm transition-colors whitespace-nowrap"
            >
              {isFullScreen ? '⤓ Exit' : '⤢ Full screen'}
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchTo2DMap}
            aria-label="Toggle to 2D Operational View"
            className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-xl bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sm transition-colors whitespace-nowrap"
          >
            2D map →
          </button>
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock (Zero Side-Panel Clutter) */}
      <div className={`absolute inset-x-3 sm:inset-x-4 bottom-3 z-20 mx-auto transition-all duration-200 ${controlsCollapsed ? 'max-w-max' : 'max-w-[960px]'}`}>
        <div className={`flex ${controlsCollapsed ? 'justify-end' : 'justify-center'} mb-1`}>
          <button
            type="button"
            onClick={() => setControlsCollapsed((prev) => !prev)}
            aria-expanded={!controlsCollapsed}
            className="px-3 py-2 text-[11px] font-medium bg-slate-950/90 backdrop-blur-lg border border-white/15 rounded-xl text-slate-100 hover:text-white shadow-lg"
          >
            {controlsCollapsed
              ? '▴ Analysis controls'
              : '▾ Hide controls'}
          </button>
        </div>

        {!controlsCollapsed && <div className="max-h-[48vh] overflow-y-auto bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl space-y-3 text-slate-200">
          {/* Row 1: Region Presets + NASA MODIS/VIIRS Sensor Filter & Intensity Scaling */}
          <div
            data-testid="globe-firms-overlay-controls"
            className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2"
          >
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCameraPreset('nilgiri');
                  onSelectRegion(MONITORED_REGIONS[0]);
                }}
                className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  cameraPreset === 'nilgiri'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Nilgiris
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraPreset('sierra');
                  onSelectRegion(MONITORED_REGIONS[1]);
                }}
                className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  cameraPreset === 'sierra'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sierra Basin
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraPreset('arcadia');
                  onSelectRegion(MONITORED_REGIONS[2]);
                }}
                className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  cameraPreset === 'arcadia'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Arcadia
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('global')}
                className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  cameraPreset === 'global'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Full Earth
              </button>
            </div>

            {/* Real-Time NASA MODIS/VIIRS Filter Pills & Intensity Scale Multiplier */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                role="group"
                aria-label="NASA FIRMS Sensor Filter"
                className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0"
              >
                {(
                  [
                    ['ALL', `All FIRMS (${hotspotOverlay.totalCount})`],
                    ['VIIRS_ONLY', `◆ VIIRS 375m (${hotspotOverlay.viirsCount})`],
                    ['MODIS_ONLY', `● MODIS 1km (${hotspotOverlay.modisCount})`],
                  ] as [GlobeHotspotSensorFilter, string][]
                ).map(([filterKey, label]) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setSensorFilter(filterKey)}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded-md whitespace-nowrap transition-colors ${
                      sensorFilter === filterKey
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                <label
                  htmlFor="hotspot-intensity-scale-slider"
                  className="text-[10px] font-mono text-slate-400 whitespace-nowrap"
                >
                  FRP Scale:
                </label>
                <input
                  id="hotspot-intensity-scale-slider"
                  type="range"
                  min={0.6}
                  max={2.4}
                  step={0.1}
                  value={intensityScaleMultiplier}
                  onChange={(e) =>
                    setIntensityScaleMultiplier(Number(e.target.value))
                  }
                  className="w-16 accent-rose-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-rose-300 w-8 text-right">
                  {intensityScaleMultiplier.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Click-to-Pin Coordinate Selector & Instant Incident Record Generator */}
          <div
            data-testid="globe-click-to-pin-bar"
            className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-2 pt-3 border-t border-slate-800/90"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setClickToPinMode((v) => !v)}
                className={`px-2 py-1 text-[11px] font-mono font-semibold rounded-lg border whitespace-nowrap transition-colors ${
                  clickToPinMode
                    ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {clickToPinMode ? '⊕ Pin Mode: ON' : '⊕ Pin Mode: OFF'}
              </button>

              <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 whitespace-nowrap">
                <strong className="text-emerald-300">
                  {pinnedDraft.lat.toFixed(3)}°N, {pinnedDraft.lng.toFixed(3)}°E
                </strong>
              </span>

              <button
                type="button"
                onClick={() => handlePinCoordinate(11.4642, 76.6485)}
                className="px-2 py-1 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 whitespace-nowrap"
              >
                Nilgiri Pin
              </button>
              <button
                type="button"
                onClick={() => handlePinCoordinate(40.0412, -120.742)}
                className="px-2 py-1 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 whitespace-nowrap"
              >
                Sierra Pin
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[160px] max-w-[230px]">
              <input
                type="text"
                aria-label="Pinned Incident Title"
                value={pinnedDraft.customTitle}
                onChange={(e) =>
                  setPinnedDraft((prev) => ({
                    ...prev,
                    customTitle: e.target.value,
                  }))
                }
                className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="pin-and-stay-btn"
                onClick={() => handleGenerateIncidentFromPin(false)}
                className="px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-colors"
              >
                + Pin to Globe
              </button>
              <button
                type="button"
                data-testid="generate-pinned-incident-btn"
                onClick={() => handleGenerateIncidentFromPin(true)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 whitespace-nowrap transition-colors shadow-xs"
              >
                Generate Incident & Open Intelligence →
              </button>
            </div>
          </div>

          {/* Row 3: TSL Earth Spherical Sun Direction (Theta / Phi), Clouds/Orbits & Atmosphere Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-3 border-t border-slate-800/90 items-center">
            <div className="sm:col-span-4 flex items-center gap-2">
              <label
                htmlFor="tsl-sun-theta-slider"
                className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0"
              >
                Solar θ:
              </label>
              <input
                id="tsl-sun-theta-slider"
                type="range"
                min={-3.14}
                max={3.14}
                step={0.05}
                value={sunTheta}
                onChange={(e) => setSunTheta(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-sky-300 w-11 text-right shrink-0">
                {sunTheta.toFixed(2)}r
              </span>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2">
              <label
                htmlFor="tsl-sun-phi-slider"
                className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0"
              >
                Sun φ:
              </label>
              <input
                id="tsl-sun-phi-slider"
                type="range"
                min={0.35}
                max={2.75}
                step={0.05}
                value={sunPhi}
                onChange={(e) => setSunPhi(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-amber-300 w-9 text-right shrink-0">
                {sunPhi.toFixed(2)}
              </span>
            </div>

            <div className="sm:col-span-5 flex items-center justify-end gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setCloudsVisible((v) => !v)}
                className={`px-2 py-1 text-[10px] font-mono rounded-md border whitespace-nowrap transition-colors ${
                  cloudsVisible
                    ? 'bg-sky-950/90 border-sky-500/60 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {cloudsVisible ? '● Clouds' : '○ Clouds'}
              </button>
              <button
                type="button"
                onClick={() => setOrbitPassVisible((v) => !v)}
                className={`px-2 py-1 text-[10px] font-mono rounded-md border whitespace-nowrap transition-colors ${
                  orbitPassVisible
                    ? 'bg-sky-950/90 border-sky-500/60 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {orbitPassVisible ? '● Orbits' : '○ Orbits'}
              </button>
              {ATMOSPHERE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAtmospherePresetId(preset.id)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-md border whitespace-nowrap transition-colors ${
                    atmospherePresetId === preset.id
                      ? 'bg-slate-800 border-sky-400 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.id === 'tsl_classic'
                    ? 'TSL Default'
                    : preset.id === 'solar_flare'
                    ? 'Solar Flare'
                    : 'Mesosphere'}
                </button>
              ))}
              {lastCreatedPinId && (
                <span className="text-[10px] font-mono text-emerald-400 px-1.5">
                  Pinned: {lastCreatedPinId}
                </span>
              )}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};
