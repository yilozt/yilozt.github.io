window.addEventListener("load", () => {
  const id="uniform_mat";

  let handler = 0;

  ScrollReveal().reveal("#" + id, {
    reset: true,
    afterReveal: () => render(),
    afterReset: () => cancelAnimationFrame(handler),
  });
  const canvas = document.getElementById(id);
  canvas.width = 700;
  canvas.height = canvas.width * (9 / 20);

  /** @type {WebGLRenderingContext} */
  const gl = canvas.getContext("webgl");

  if (!gl) {
    return;
  }

  //////////////// end config ////////////////

  /// Objects to use
  let program = 0;

  function startup() {
    const vs_source = `
    attribute vec4 position;
    attribute vec4 color;
    uniform mat4 mv_mat;
    varying lowp vec4 vertex_color;

    void main() {
      gl_Position = mv_mat * position;
      vertex_color = color;
    }
    `;

    const fs_source = `
    varying lowp vec4 vertex_color;
    void main() {
      gl_FragColor = vertex_color;
    }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vs_source);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fs_source);
    gl.compileShader(fs);
    
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const positon_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positon_buf);

    const vertices = [
      -0.5, -0.5, 0.0,
       0.5, -0.5, 0.0,
       0.0,  0.5, 0.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const location_position = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(location_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location_position);

    const color_buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);

    const colors = [
       1.0,  0.0, 0.0, 1.0,
       0.0,  1.0, 0.0, 1.0,
       0.0,  0.0, 1.0, 1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const location_color = gl.getAttribLocation(program, "color");
    gl.vertexAttribPointer(location_color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location_color);

    gl.useProgram(program);
  }

  function render() {
    handler = requestAnimationFrame(render);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let rotate_mat = mat4.create();
    mat4.rotateY(rotate_mat, mat4.create(), new Date().valueOf() / 1000);
    let location_mv_mat = gl.getUniformLocation(program, "mv_mat");
    gl.uniformMatrix4fv(location_mv_mat, false, rotate_mat);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

  }

  startup();
});
