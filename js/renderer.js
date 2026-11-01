// Draws every sphere as a camera-facing quad. The fragment shader intersects the view ray with
// the sphere, so spheres stay perfectly round at two triangles each.

const FLOATS_PER_SPHERE = 7; // x, y, z, radius, r, g, b
const MAX_SHADOWS = 12;
const COARSE_DISTANCE = 35;
const SKY_COLOR = [0.56, 0.8, 0.96];

const SPHERE_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSphere;
layout(location = 2) in vec3 aColor;
uniform mat4 uView;
uniform mat4 uProj;
out vec3 vRay;
flat out vec3 vCenter;
flat out float vRadius;
flat out vec3 vColor;

void main() {
  vec3 center = (uView * vec4(aSphere.xyz, 1.0)).xyz;
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
  vec3 position = center + (right * aCorner.x + up * aCorner.y) * extent;
  vRay = position;
  vCenter = center;
  vRadius = radius;
  vColor = aColor;
  gl_Position = uProj * vec4(position, 1.0);
}`;

const SPHERE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vRay;
flat in vec3 vCenter;
flat in float vRadius;
flat in vec3 vColor;
uniform mat4 uProj;
uniform mat4 uInvView;
uniform vec3 uLightDir;
uniform vec3 uSky;
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

  vec4 clip = uProj * vec4(hit, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;

  float diffuse = max(dot(normal, uLightDir), 0.0);
  float facing = max(-dot(normal, ray), 0.0);
  vec3 color = vColor * (0.5 + 0.65 * diffuse) * (0.72 + 0.28 * facing);

  vec3 world = (uInvView * vec4(hit, 1.0)).xyz;
  float shade = 1.0;
  for (int i = 0; i < uShadowCount; i++) {
    vec4 caster = uShadows[i];
    if (world.y < caster.y) {
      float d = length(world.xz - caster.xz);
      shade = min(shade, mix(0.55, 1.0, smoothstep(caster.w * 0.6, caster.w, d)));
    }
  }
  color *= shade;

  float fog = 1.0 - exp(-t * t * 0.00012);
  outColor = vec4(mix(color, uSky, fog), 1.0);
}`;

function compileProgram(gl, vertexSource, fragmentSource) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

function createRenderer(canvas, world) {
  const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('Bu tarayıcı WebGL2 desteklemiyor.');

  const program = compileProgram(gl, SPHERE_VERTEX_SHADER, SPHERE_FRAGMENT_SHADER);
  const uniforms = {};
  for (const name of ['uView', 'uProj', 'uInvView', 'uLightDir', 'uSky', 'uShadows', 'uShadowCount']) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribDivisor(2, 1);

  const staticBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, world.sphereData, gl.STATIC_DRAW);
  const dynamicBuffer = gl.createBuffer();

  const stride = FLOATS_PER_SPHERE * 4;
  const drawSpheres = (buffer, first, count) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, first * stride);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, first * stride + 16);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  };

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2], 1);

  const lightDirWorld = normalize3([0.45, 0.8, 0.35]);
  const shadowData = new Float32Array(MAX_SHADOWS * 4);

  // Returns how many spheres were submitted this frame.
  function render(eye, target, shadows, dynamicData, dynamicCount) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const proj = perspective(1.05, width / height, 0.1, 220);
    const { view, invView } = lookAt(eye, target);
    const planes = frustumPlanes(multiply4(proj, view));
    const lightView = [
      view[0] * lightDirWorld[0] + view[4] * lightDirWorld[1] + view[8] * lightDirWorld[2],
      view[1] * lightDirWorld[0] + view[5] * lightDirWorld[1] + view[9] * lightDirWorld[2],
      view[2] * lightDirWorld[0] + view[6] * lightDirWorld[1] + view[10] * lightDirWorld[2],
    ];

    const shadowCount = Math.min(shadows.length, MAX_SHADOWS);
    for (let i = 0; i < shadowCount; i++) shadowData.set(shadows[i], i * 4);

    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uView, false, view);
    gl.uniformMatrix4fv(uniforms.uProj, false, proj);
    gl.uniformMatrix4fv(uniforms.uInvView, false, invView);
    gl.uniform3fv(uniforms.uLightDir, lightView);
    gl.uniform3fv(uniforms.uSky, SKY_COLOR);
    gl.uniform4fv(uniforms.uShadows, shadowData);
    gl.uniform1i(uniforms.uShadowCount, shadowCount);

    let drawn = 0;
    for (const chunk of world.chunks) {
      const c = chunk.center;
      if (planes.some((p) => p[0] * c[0] + p[1] * c[1] + p[2] * c[2] + p[3] < -chunk.radius)) continue;
      const distance = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - chunk.radius;
      const range = distance > COARSE_DISTANCE ? chunk.coarse : chunk.fine;
      if (range.count === 0) continue;
      drawSpheres(staticBuffer, range.first, range.count);
      drawn += range.count;
    }

    if (dynamicCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, dynamicData.subarray(0, dynamicCount * FLOATS_PER_SPHERE), gl.DYNAMIC_DRAW);
      drawSpheres(dynamicBuffer, 0, dynamicCount);
      drawn += dynamicCount;
    }
    return drawn;
  }

  return { render };
}
