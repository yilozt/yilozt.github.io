---
title: OpenGL超级宝典第七版学习笔记 (6)：着色器和程序
date: 2022-03-04 23:17:31
tags: OpenGL
categories: 学习笔记
summary: 主要是关于着色器的编译和链接过程，以及一些二进制缓存相关的知识
---

## 0.准备

- The OpenGL® Shading Language：https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf

为 vscode 配置 glsl 插件：

- 编辑器：vscode
- 拓展：GLSL Lint、Shader languages support for VS Code
- https://github.com/KhronosGroup/glslang，`pacman -S glslang`，/usr/bin/glslangValidator

```bash
glslangValidator -S vert test.vs
```

## 1. GLSL

### 数据类型

### 向量、矩阵操作

### 数学运算函数

## 2. 获取着色器错误信息

### 着色器编译错误

-__查询着色器信息__
```c
void glGetShaderiv(GLuint shader,
                   GLenum pname,
                   GLint *params);
```
GL_SHADER_TYPE, GL_DELETE_STATUS, GL_COMPILE_STATUS, GL_INFO_LOG_LENGTH, GL_SHADER_SOURCE_LENGTH
-__获取错误日志__

```c
void glGetShaderInfoLog(GLuint shader,
                        GLsizei maxLength,
                        GLsizei *length,
                        GLchar *infoLog);
```
-用 `GL_COMPILE_STATUS` 查询编译状态，如果编译失败，用 `glGetShaderInfoLog()` 存储错误信息：
```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App;
# 
# unsafe fn test_shader() -> Result<(), Box<dyn std::error::Error>> {
#     let src = "#version 460 core
# 
#     layout (location = 0) out vec4 color;
# 
#     uniform scale;
#     uniform vec3 bias;
#     
#     void main(void)
#     {
#         color = vec4(1.0, 0.5, 0.2, 1.0) * scale + bias;
#     }";
#     let src = std::ffi::CString::new(src)?;
# 
#     let shader = gl::CreateShader(gl::FRAGMENT_SHADER);
#     gl::ShaderSource(shader, 1, &src.as_ptr(), std::ptr::null());
gl::CompileShader(shader);

// check shader compile status
let mut success = 0;
gl::GetShaderiv(shader, gl::COMPILE_STATUS, &mut success);
    if success != gl::TRUE as i32 {
        // get log length
        let mut len = 0;
        gl::GetShaderiv(shader, gl::INFO_LOG_LENGTH, &mut len);

        // alloc buffer to store log info
        let mut log: Vec<u8> = Vec::with_capacity(len as _);
        log.resize(len as _, 0);

        // use glGetShaderInfoLog() to store log info
        gl::GetShaderInfoLog(shader, len,
                            std::ptr::null_mut(),
                            log.as_mut_ptr() as _);

        // print error log
        let log = std::str::from_utf8(&log)?;
        println!("{}", log);
    }
# 
#     Ok(())
# }
# 
# impl Application for App {
#     fn startup(&mut self) {
#         if let Err(e) = unsafe { test_shader() } {
#             println!("err: {:?}", e);
#         }
#     }
# }
# 
# fn main() {
#     App.run();
# }
# 
```
这是 docs.gl 里使用的方法，书里没有检查 COMPILE_STATUS，反正效果一样就是了：

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App;
# 
# unsafe fn test_shader() -> Result<(), Box<dyn std::error::Error>> {
#     let src = "#version 460 core
# 
#     layout (location = 0) out vec4 color;
# 
#     uniform scale;
#     uniform vec3 bias;
#     
#     void main(void)
#     {
#         color = vec4(1.0, 0.5, 0.2, 1.0) * scale + bias;
#     }";
#     let vs_src = std::ffi::CString::new(src)?;
# 
#     let shader = gl::CreateShader(gl::FRAGMENT_SHADER);
#     gl::ShaderSource(shader, 1, &vs_src.as_ptr(), std::ptr::null());
#     gl::CompileShader(shader);
# 
    let mut len = 0;
    let mut log: Vec<u8> = Vec::with_capacity(len as _);

    gl::GetShaderiv(shader, gl::INFO_LOG_LENGTH, &mut len);
    log.resize(len as _, 0);
    gl::GetShaderInfoLog(shader, len, std::ptr::null_mut(),
                        log.as_mut_ptr() as _);

    let log = std::str::from_utf8(&log)?;
    println!("{}", log);
# 
#     Ok(())
# }
# 
# impl Application for App {
#     fn startup(&mut self) {
#         if let Err(e) = unsafe { test_shader() } {
#             println!("err: {:?}", e);
#         }
#     }
# }
# 
# fn main() {
#     App.run();
# }
```

着色器：

```glsl
version 460 core

layout (location = 0) out vec4 color;

uniform scale;
uniform vec3 bias;

void main(void)
{
    color = vec4(1.0, 0.5, 0.2, 1.0) * scale + bias;
}
```

对应的错误输出，不同的 OpenGL 实现输出的信息不同：

```
0:5(15): error: syntax error, unexpected ';', expecting '{'
```
  
  // todo webgl_demo

### 着色器程序链接错误

`glGetProgramInfoLog()` `glGetProgramiv()`：

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App;
# 
# unsafe fn test_shader() -> Result<(), Box<dyn std::error::Error>> {
#     let vs_src = "#version 460 core
# 
#     void main(void)
#     {
#         const vec4 vertices[3] = {
#             vec4( 0.25, -0.25, 0.5, 1.0),
#             vec4(-0.25, -0.25, 0.5, 1.0),
#             vec4( 0.25,  0.25, 0.5, 1.0)
#         };
#   
#         gl_Position = vertices[gl_VertexID];
#     }";
#     let vs_src = std::ffi::CString::new(vs_src)?;
# 
#     let vs = gl::CreateShader(gl::VERTEX_SHADER);
#     gl::ShaderSource(vs, 1, &vs_src.as_ptr(), std::ptr::null());
#     gl::CompileShader(vs);
# 
#     let fs_src = "#version 460 core
# 
#     layout (location = 0) out vec4 color;
#     
#     vec3 myFunction();
#     
#     void main(void)
#     {
#         color = vec4(myFunction(), 1.0);
#     }";
# 
#     let fs_src = std::ffi::CString::new(fs_src)?;
# 
#     let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#     gl::ShaderSource(fs, 1, &fs_src.as_ptr(), std::ptr::null());
#     gl::CompileShader(fs);
# 
    let program = gl::CreateProgram();
    gl::AttachShader(program, vs);
    gl::AttachShader(program, fs);
    gl::LinkProgram(program);

    let mut len = 0;
    gl::GetProgramiv(program, gl::INFO_LOG_LENGTH, &mut len);

    let mut log: Vec<u8> = Vec::with_capacity(len as _);
    log.resize(len as _, 0);

    gl::GetProgramInfoLog(program, len, std::ptr::null_mut(),
                          log.as_ptr() as _);

    println!("{}", std::str::from_utf8(&log)?);

#     Ok(())
# }
# 
# impl Application for App {
#     fn startup(&mut self) {
#         if let Err(e) = unsafe { test_shader() } {
#             println!("err: {:?}", e);
#         }
#     }
# }
# 
# fn main() {
#     App.run();
# }
```

## 3. 单独程序

在 `glLinkProgram()` 前调用 

```c
void glProgramParameteri(GLuint program,
                         GLenum pname,
                         GLint value);
```

类似与 `glTexParameteri()`，`pname` = `GL_PROGRAM_SEPARABLE`，value = `GL_TRUE`，调用 `glUseProgramStages()` 将 program 添加到管线对象里。`glBindProgramPipeline()`：使用管线对象进行渲染

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App {
#     vao: u32,
#     pipeline: u32,
# }
# 
# unsafe fn init_pipeline() -> Result<u32, Box<dyn std::error::Error>> {
#     let vs_src = std::ffi::CString::new(
#         "#version 460 core
# 
#         out vec4 vs_color;
# 
#         void main(void)
#         {
#             const vec4 vertices[3] = {
#                 vec4( 0.5, -0.5, 0.0, 1.0),
#                 vec4(-0.5, -0.5, 0.0, 1.0),
#                 vec4( 0.0,  0.5, 0.0, 1.0)
#             };
# 
#             const vec4 colors[3] = {
#                 vec4(1.0, 0.0, 0.0, 1.0),
#                 vec4(0.0, 1.0, 0.0, 1.0),
#                 vec4(0.0, 0.0, 1.0, 1.0),
#             };
#     
#             gl_Position = vertices[gl_VertexID];
#             vs_color = colors[gl_VertexID];
#         }",
#     )?;
# 
    let vs = gl::CreateShader(gl::VERTEX_SHADER);
    gl::ShaderSource(vs, 1, &vs_src.as_ptr(), std::ptr::null());
    gl::CompileShader(vs);
# 
#     let fs_src = std::ffi::CString::new(
#         "#version 460 core
# 
#         layout (location = 0) out vec4 color;
#         in vec4 vs_color;
# 
#         void main(void)
#         {
#             color = vs_color;
#         }",
#     )?;
# 
    let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
    gl::ShaderSource(fs, 1, &fs_src.as_ptr(), std::ptr::null());
    gl::CompileShader(fs);

    let vs_prog = gl::CreateProgram();
    gl::AttachShader(vs_prog, vs);
    gl::ProgramParameteri(vs_prog, gl::PROGRAM_SEPARABLE, gl::TRUE as _);
    gl::LinkProgram(vs_prog);

    let fs_prog = gl::CreateProgram();
    gl::AttachShader(fs_prog, fs);
    gl::ProgramParameteri(fs_prog, gl::PROGRAM_SEPARABLE, gl::TRUE as _);
    gl::LinkProgram(fs_prog);

    let mut pipeline = 0;
    gl::CreateProgramPipelines(1, &mut pipeline);
    gl::UseProgramStages(pipeline, gl::VERTEX_SHADER_BIT, vs_prog);
    gl::UseProgramStages(pipeline, gl::FRAGMENT_SHADER_BIT, fs_prog);

    gl::DeleteShader(vs);
    gl::DeleteShader(fs);
    gl::DeleteProgram(vs_prog);
    gl::DeleteProgram(fs_prog);

#     Ok(pipeline)
# }
# 
# impl Application for App {
#     fn startup(&mut self) {
#         unsafe {
#             let mut vao = 0;
#             gl::CreateVertexArrays(1, &mut vao);
#             gl::BindVertexArray(vao);
# 
#             let pipeline = init_pipeline().unwrap();
            gl::BindProgramPipeline(pipeline);
# 
#             *self = Self { vao, pipeline }
#         }
#     }
# 
#     fn render(&self, _current_time: f64) {
#         unsafe {
#             gl::ClearBufferfv(gl::COLOR, 0, [0.0, 0.0, 0.0, 1.0].as_ptr());
#             gl::DrawArrays(gl::TRIANGLES, 0, 3);
#         }
#     }
# 
#     fn shutdown(&mut self) {
#         unsafe {
#             gl::DeleteProgramPipelines(1, &self.pipeline);
#             gl::DeleteVertexArrays(1, &self.vao);
#         }
#     }
# }
# 
# fn main() {
#     App::default().run();
# }
```
`glCreateShaderProgram()`

translate: 

```c
const GLuint shader = glCreateShader(type);
if (shader) {
    glShaderSource(shader, count, strings, NULL);
    glCompileShader(shader);
    const GLuint program = glCreateProgram();
    if (program) {
        GLint compiled = GL_FALSE;
        glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        glProgramParameteri(program, GL_PROGRAM_SEPARABLE, GL_TRUE);
        if (compiled) {
            glAttachShader(program, shader);
            glLinkProgram(program);
            glDetachShader(program, shader);
        }
        /* append-shader-info-log-to-program-info-log */
    }
    glDeleteShader(shader);
    return program;
} else {
    return 0;
}
```

### 接口匹配

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App {
#     info: String,
# }
# 
# impl Application for App {
#     fn startup(&mut self) {
#         unsafe {
#             let src = std::ffi::CString::new(
#                 "#version 460 core
# 
#                  out vec4 color;
#                  layout (location = 2) out ivec2 data;
#                  out float extra;
# 
#                  void main() {
#                      color = vec4(1.0);
#                      data = ivec2(1, 2);
#                      extra = 1.0;
#                  }",
#             )
#             .unwrap();
# 
#             let prog = gl::CreateShaderProgramv(
#                 gl::FRAGMENT_SHADER, 1,
#                 &src.as_ptr()
#             );
# 
let mut counts = 0;
gl::GetProgramInterfaceiv(
    prog,
    gl::PROGRAM_OUTPUT,
    gl::ACTIVE_RESOURCES,
    &mut counts
);
# 
# let name_of = |name| match name as u32 {
#     gl::FLOAT_VEC4 => "vec4",
#     gl::INT_VEC2 => "ivec2",
#     gl::FLOAT => "float",
#     _ => "unknown",
# };

for index in 0..counts {
    let mut params = [0; 2];
    let mut name = [0u8; 64];
    gl::GetProgramResourceiv(
        prog,
        gl::PROGRAM_OUTPUT,
        index as _,
        2,
        [gl::TYPE, gl::LOCATION].as_ptr(),
        2,
        std::ptr::null_mut(),
        params.as_mut_ptr(),
    );
    gl::GetProgramResourceName(
        prog,
        gl::PROGRAM_OUTPUT,
        index as _,
        64,
        std::ptr::null_mut(),
        name.as_mut_ptr() as _,
    );

    self.info.push_str(&format!(
        "Index {}: {} {} @ location {}\n",
        index,
        std::str::from_utf8(&name)
            .unwrap_or("unknown")
            .trim_matches('\u{0}'),
        name_of(params[0]),
        params[1]
    ));
}
# 
#             gl::DeleteProgram(prog);
# 
#             println!("{}", self.info);
#         }
#     }
# 
#     fn ui(&mut self, ui: &imgui_glfw_rs::imgui::Ui) {
#         use imgui_glfw_rs::imgui;
#         let win = imgui::Window::new("OpenGL - Information")
#             .resizable(false)
#             .no_decoration()
#             .position([10., 10.], imgui::Condition::Always);
#         if let Some(end) = win.begin(ui) {
#             ui.text(format!("{}", self.info));
#             end.end();
#         }
#     }
# }
# 
# fn main() {
#     App::default().run();
# }
```

```
Index 0: color vec4 @ location 0
Index 1: data ivec2 @ location 2
Index 2: extra float @ location 1
```

## 4. 着色器子程序

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct Uniforms {
#     subroutine1: i32,
# }
# 
# #[derive(Default)]
# struct App {
#     render_program: u32,
#     vao: u32,
#     subroutines: [u32; 2],
#     uniforms: Uniforms,
# }
# 
# impl App {
#     fn load_shaders(&mut self) {
#         if self.render_program != 0 {
#             unsafe { gl::DeleteProgram(self.render_program) };
#         }
# 
#         self.render_program = sb7::program::link_from_shaders(
#             &[
#                 sb7::shader::load(
#                     "media/shaders/subroutines/subroutines.vs.glsl",
#                     gl::VERTEX_SHADER,
#                     true,
#                 ),
#                 sb7::shader::load(
#                     "media/shaders/subroutines/subroutines.fs.glsl",
#                     gl::FRAGMENT_SHADER,
#                     true,
#                 ),
#             ],
#             true,
#         );
# 
#         unsafe {
// get counts of subroutine
let mut counts = 0;
gl::GetProgramStageiv(
    self.render_program,
    gl::FRAGMENT_SHADER,
    gl::ACTIVE_SUBROUTINES,
    &mut counts,
);

let mut name = [0u8; 256];
for i in 0..counts {
    gl::GetProgramResourceName(
        self.render_program,
        gl::FRAGMENT_SUBROUTINE,
        i as _,
        256,
        std::ptr::null_mut(),
        name.as_mut_ptr() as _,
    );

    let name = std::ffi::CString::new(
        std::str::from_utf8(&name).unwrap().trim_matches('\u{0}'),
    )
    .unwrap();

    self.subroutines[i as usize] = gl::GetSubroutineIndex(
        self.render_program,
        gl::FRAGMENT_SHADER,
        name.as_ptr()
    );
}

let name = std::ffi::CString::new("mySubroutineUniform").unwrap();
self.uniforms.subroutine1 = gl::GetSubroutineUniformLocation(
    self.render_program,
    gl::FRAGMENT_SHADER,
    name.as_ptr(),
);
#         }
#     }
# }
# 
# impl Application for App {
#     fn init(&self) -> AppConfig {
#         AppConfig {
#             title: "OpenGL SuperBible - Shader Subroutines".into(),
#             ..Default::default()
#         }
#     }
# 
#     fn startup(&mut self) {
#         self.load_shaders();
# 
#         unsafe {
#             gl::GenVertexArrays(1, &mut self.vao);
#             gl::BindVertexArray(self.vao);
#         }
#     }
# 
#     fn render(&self, current_time: f64) {
#         let i = current_time as usize;
#         unsafe {
#             gl::UseProgram(self.render_program);
# 
#             gl::UniformSubroutinesuiv(
#                 gl::FRAGMENT_SHADER,
#                 1,
#                 &self.subroutines[i & 1]
#             );
# 
#             gl::DrawArrays(gl::TRIANGLE_STRIP, 0, 4);
#         }
#     }
# 
#     fn on_key(&mut self, key: imgui_glfw_rs::glfw::Key,
#               press: imgui_glfw_rs::glfw::Action) {
#         if let imgui_glfw_rs::glfw::Action::Press = press {
#             match key {
#                 imgui_glfw_rs::glfw::Key::R => self.load_shaders(),
#                 _ => {}
#             }
#         }
#     }
# }
# 
# fn main() {
#     App::default().run();
# }
```

## 5. 着色器程序二进制

---------------------

TODO：