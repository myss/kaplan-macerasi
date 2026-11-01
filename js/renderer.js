// Draws every sphere as a camera-facing quad. The fragment shader intersects the view ray with
// the sphere, so spheres stay perfectly round at two triangles each.

const FLOATS_PER_SPHERE = 7; // x, y, z, radius, r, g, b
const MAX_SHADOWS = 12;
const COARSE_DISTANCE = 35;
const BASE_FOG_DENSITY = 0.00012;
const THICK_FOG_DENSITY = 0.003;

const SPHERE_VERTEX_SHADER = `
in vec3 position;
in vec4 aSphere;
in vec3 aColor;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vRay;
flat out vec3 vCenter;
flat out float vRadius;
flat out vec3 vColor;

void main() {
  vec3 center = (viewMatrix * vec4(aSphere.xyz, 1.0)).xyz;
  float radius = aSphere.w;
  float dist2 = dot(center, center);
  if (dist2 <= radius * radius * 1.01) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float dist = sqrt(dist2);
  vec3 dir = center / dist;
  vec3 right = cross(vec3(0.0, 1.0, 0.0), dir);
  right = dot(right, right) < 1e-5 ? vec3(1.0, 0.0, 0.0) : normalize(right);
  vec3 up = cross(dir, right);
  // A sphere's silhouette is larger than its radius under perspective.
  float extent = radius * dist / sqrt(dist2 - radius * radius);
  vec3 corner = center + (right * position.x + up * position.y) * extent;
  vRay = corner;
  vCenter = center;
  vRadius = radius;
  vColor = aColor;
  gl_Position = projectionMatrix * vec4(corner, 1.0);
}`;

const SPHERE_FRAGMENT_SHADER = `
precision highp float;
in vec3 vRay;
flat in vec3 vCenter;
flat in float vRadius;
flat in vec3 vColor;
uniform mat4 projectionMatrix;
uniform mat4 uCameraToWorld;
uniform vec3 uLightDir;
uniform vec3 uSky;
uniform float uFogDensity;
uniform vec4 uShadows[${MAX_SHADOWS}];
uniform int uShadowCount;
out vec4 outColor;

void main() {
  vec3 ray = normalize(vRay);
  float b = dot(ray, vCenter);
  float h = b * b - dot(vCenter, vCenter) + vRadius * vRadius;
  if (h < 0.0) discard;
  float t = b - sqrt(h);
  if (t <= 0.0) discard;
  vec3 hit = ray * t;
  vec3 normal = (hit - vCenter) / vRadius;

  vec4 clip = projectionMatrix * vec4(hit, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;

  float diffuse = max(dot(normal, uLightDir), 0.0);
  float facing = max(-dot(normal, ray), 0.0);
  vec3 color = vColor * (0.5 + 0.65 * diffuse) * (0.72 + 0.28 * facing);

  vec3 world = (uCameraToWorld * vec4(hit, 1.0)).xyz;
  float shade = 1.0;
  for (int i = 0; i < uShadowCount; i++) {
    vec4 caster = uShadows[i];
    if (world.y < caster.y) {
      float d = length(world.xz - caster.xz);
      shade = min(shade, mix(0.55, 1.0, smoothstep(caster.w * 0.6, caster.w, d)));
    }
  }
  color *= shade;

  float fog = 1.0 - exp(-t * t * uFogDensity);
  outColor = vec4(mix(color, uSky, fog), 1.0);
}`;

function createRenderer(canvas, dynamicData) {
  // The shader's colours are final screen colours, so Three.js must not convert them.
  THREE.ColorManagement.enabled = false;
  const three = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  three.sortObjects = false;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
  const scene = new THREE.Scene();

  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: SPHERE_VERTEX_SHADER,
    fragmentShader: SPHERE_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    uniforms: {
      uCameraToWorld: { value: camera.matrixWorld },
      uLightDir: { value: new THREE.Vector3() },
      uSky: { value: new THREE.Vector3() },
      uFogDensity: { value: BASE_FOG_DENSITY },
      uShadows: { value: Array.from({ length: MAX_SHADOWS }, () => new THREE.Vector4()) },
      uShadowCount: { value: 0 },
    },
  });

  const quadCorners = new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]), 3);
  const quadIndex = new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 2, 1, 3]), 1);

  // Spheres from `first` onwards in a shared buffer, drawn as one instanced mesh.
  const createSphereMesh = (buffer, first, count) => {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(quadIndex);
    geometry.setAttribute('position', quadCorners);
    geometry.setAttribute('aSphere', new THREE.InterleavedBufferAttribute(buffer, 4, first * FLOATS_PER_SPHERE));
    geometry.setAttribute('aColor', new THREE.InterleavedBufferAttribute(buffer, 3, first * FLOATS_PER_SPHERE + 4));
    geometry.instanceCount = count;
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  };

  const dynamicBuffer = new THREE.InstancedInterleavedBuffer(dynamicData, FLOATS_PER_SPHERE);
  dynamicBuffer.setUsage(THREE.DynamicDrawUsage);
  let chunkMeshes = [];
  let dynamicMesh = null;

  // Every mesh goes, the moving ones too: disposing a geometry frees the quad buffers they share.
  function loadWorld(world) {
    for (const mesh of scene.children) mesh.geometry.dispose();
    scene.clear();

    three.setClearColor(new THREE.Color(...world.theme.sky));
    material.uniforms.uSky.value.set(...world.theme.sky);
    material.uniforms.uFogDensity.value = world.theme.fogDensity ?? BASE_FOG_DENSITY;

    const staticBuffer = new THREE.InstancedInterleavedBuffer(world.sphereData, FLOATS_PER_SPHERE);
    chunkMeshes = world.chunks.map((chunk) => {
      const bounds = new THREE.Sphere(new THREE.Vector3(...chunk.center), chunk.radius);
      const fine = createSphereMesh(staticBuffer, chunk.fine.first, chunk.fine.count);
      const coarse = createSphereMesh(staticBuffer, chunk.coarse.first, chunk.coarse.count);
      fine.geometry.boundingSphere = bounds;
      coarse.geometry.boundingSphere = bounds;
      return { bounds, fine, coarse };
    });

    dynamicMesh = createSphereMesh(dynamicBuffer, 0, 0);
    dynamicMesh.frustumCulled = false;
  }

  const lightDirWorld = new THREE.Vector3(0.45, 0.8, 0.35).normalize();

  // Returns how many spheres were drawn this frame.
  function render(eye, target, shadows, dynamicCount) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const size = three.getSize(new THREE.Vector2());
    if (size.x !== width || size.y !== height) {
      three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      three.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    camera.position.set(...eye);
    camera.lookAt(...target);
    camera.updateMatrixWorld();

    const { uLightDir, uShadows, uShadowCount } = material.uniforms;
    uLightDir.value.copy(lightDirWorld).transformDirection(camera.matrixWorldInverse);
    uShadowCount.value = Math.min(shadows.length, MAX_SHADOWS);
    for (let i = 0; i < uShadowCount.value; i++) uShadows.value[i].fromArray(shadows[i]);

    for (const { bounds, fine, coarse } of chunkMeshes) {
      const useCoarse = camera.position.distanceTo(bounds.center) - bounds.radius > COARSE_DISTANCE;
      fine.visible = !useCoarse;
      coarse.visible = useCoarse;
    }

    dynamicBuffer.addUpdateRange(0, dynamicCount * FLOATS_PER_SPHERE);
    dynamicBuffer.needsUpdate = true;
    dynamicMesh.geometry.instanceCount = dynamicCount;

    three.render(scene, camera);
    return three.info.render.triangles / 2;
  }

  const setFogDensity = (density) => {
    material.uniforms.uFogDensity.value = density;
  };

  return { loadWorld, setFogDensity, render };
}
