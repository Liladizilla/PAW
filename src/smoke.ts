type SmokeBridge = { paw?: { desktopSmokeReady?: () => Promise<unknown> } }

const canvas = document.getElementById('smoke-canvas')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Desktop smoke canvas is missing.')

function compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('WebGL could not allocate a shader.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error.'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

try {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true })
    ?? canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true })
  if (!gl) throw new Error('WebGL is unavailable in the Electron renderer.')

  // WebGL 2 requires GLSL ES 3.00 syntax; WebGL 1 uses GLSL ES 1.00.
  // Using legacy attribute/gl_FragColor syntax against WebGL 2 compiles neither
  // shader and leaves the smoke-test Electron process waiting for its timeout.
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
  const vertexSource = isWebGL2 ? `#version 300 es
    in vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  ` : `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `
  const fragmentSource = isWebGL2 ? `#version 300 es
    precision mediump float;
    out vec4 fragmentColor;
    void main() { fragmentColor = vec4(0.96, 0.61, 0.20, 1.0); }
  ` : `
    precision mediump float;
    void main() { gl_FragColor = vec4(0.96, 0.61, 0.20, 1.0); }
  `
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('WebGL could not allocate a shader program.')
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL shader program failed to link.')
  }

  const vertices = new Float32Array([0, 0.7, -0.7, -0.6, 0.7, -0.6])
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('WebGL could not allocate a vertex buffer.')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  gl.useProgram(program)
  const position = gl.getAttribLocation(program, 'position')
  if (position < 0) throw new Error('WebGL position attribute was not linked.')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * window.devicePixelRatio))
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * window.devicePixelRatio))
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.035, 0.043, 0.055, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  gl.finish()
  const error = gl.getError()
  if (error !== gl.NO_ERROR) throw new Error(`WebGL rendering failed with error code ${error}.`)

  const bridge = (window as unknown as SmokeBridge).paw
  if (!bridge?.desktopSmokeReady) throw new Error('PAW desktop smoke bridge is unavailable.')
  void bridge.desktopSmokeReady()
} catch (error) {
  console.error('PAW desktop smoke renderer failed to initialize:', error)
  throw error
}
