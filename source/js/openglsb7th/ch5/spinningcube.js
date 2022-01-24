window.addEventListener("load", () => {
  const id="spinningcube";

  let handler = 0;

  ScrollReveal().reveal("#" + id, {
    reset: true,
    opacity: 1.0,
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
    uniform mat4 mv_mat;
    uniform mat4 proj_mat;

    varying lowp vec4 vertex_color;

    void main() {
      // gl_Position = mv_mat * position;
      // gl_Position = position;
      gl_Position = proj_mat * mv_mat * position;
      vertex_color = position * 2.0 + vec4(0.5, 0.5, 0.5, 0.0);
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
      -0.25,  0.25, -0.25,
      -0.25, -0.25, -0.25,
       0.25, -0.25, -0.25,

       0.25, -0.25, -0.25,
       0.25,  0.25, -0.25,
      -0.25,  0.25, -0.25,

       0.25, -0.25, -0.25,
       0.25, -0.25,  0.25,
       0.25,  0.25, -0.25,

       0.25, -0.25,  0.25,
       0.25,  0.25,  0.25,
       0.25,  0.25, -0.25,

       0.25, -0.25,  0.25,
      -0.25, -0.25,  0.25,
       0.25,  0.25,  0.25,

      -0.25, -0.25,  0.25,
      -0.25,  0.25,  0.25,
       0.25,  0.25,  0.25,

      -0.25, -0.25,  0.25,
      -0.25, -0.25, -0.25,
      -0.25,  0.25,  0.25,

      -0.25, -0.25, -0.25,
      -0.25,  0.25, -0.25,
      -0.25,  0.25,  0.25,

      -0.25, -0.25,  0.25,
       0.25, -0.25,  0.25,
       0.25, -0.25, -0.25,

       0.25, -0.25, -0.25,
      -0.25, -0.25, -0.25,
      -0.25, -0.25,  0.25,

      -0.25,  0.25, -0.25,
       0.25,  0.25, -0.25,
       0.25,  0.25,  0.25,

       0.25,  0.25,  0.25,
      -0.25,  0.25,  0.25,
      -0.25,  0.25, -0.25
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const location_position = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(location_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location_position);

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

  }

  function render() {
    handler = requestAnimationFrame(render);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let f = new Date().valueOf() / 3000;
    let mv_mat = mat4.create();
    mat4.translate(mv_mat, mv_mat, vec3.fromValues(0.0, 0.0, -3.0));
     mat4.translate(mv_mat, mv_mat,
                    vec3.fromValues(Math.sin(2.1 * f) * 0.5,
                                    Math.cos(1.7 * f) * 0.5,
                                    Math.sin(1.3 * f) * Math.cos(1.5 * f) * 2.0));
    mat4.rotateY(mv_mat, mv_mat, f);
    mat4.rotateX(mv_mat, mv_mat, f);
    let location_mv_mat = gl.getUniformLocation(program, "mv_mat");
    gl.uniformMatrix4fv(location_mv_mat, false, mv_mat);

    let proj_mat = mat4.create();
    mat4.perspective(proj_mat,
                     50 / 180 * Math.PI,
                     canvas.clientWidth / canvas.clientHeight,
                     0.01, 1000);
    let location_proj_mat = gl.getUniformLocation(program, "proj_mat");
    gl.uniformMatrix4fv(location_proj_mat, false, proj_mat);
                 
    gl.drawArrays(gl.TRIANGLES, 0, 36);

  }

  startup();
});
