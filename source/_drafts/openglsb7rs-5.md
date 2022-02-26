---
title: OpenGL超级宝典第七版学习笔记 (5)：数据
tags: OpenGL
categories: 学习笔记
date: 2022-01-23 13:35:55
---

这是自己阅读 OpenGL 超级宝典（第七版）的笔记，源码：
- OpenGL 超级宝典（第七版）随书源码：https://github.com/openglsuperbible/sb7code
  - 随书资源文件：http://openglsuperbible.com/files/superbible7-media.zip
  - 自己尝试的 Rust 实现： https://github.com/yilozt/sb7coders
- 自己尝试的 WebGL + Rust 的展示 demo: https://github.com/yilozt/sb7coders/tree/webgl
  - 在线示例: https://yilozt.github.io/sb7coders

这一章主要介绍了 OpenGL 中两种重要的数据形式：缓冲（Buffer）和纹理（Texture）：

- 缓冲：OpenGL 里最常用的、用来存储数据的容器，可以类比成 C 里使用 malloc() 分配的一块空间，常用来存储模型的顶点数据。里面的数据线性存储，类似于一维数组。
- 纹理：用来存储多维的数据结构。如最常见的 2D 纹理，用来当作模型的贴图。

## 缓冲

一般用来存储顶点数据，然后作为顶点着色器的输入。也可以作为一般容器，用来在 OpenGL 程序和着色器之间传递数据。

### 创建缓冲区对象

一般使用 `glCreateBuffers() / glGenBuffers()`，这两个函数功能、原型相同：

```c
void glCreateBuffers (GLsizei n, GLuint *buffers);
void glGenBuffers    (GLsizei n, GLuint *buffers);
```

- 第一个参数 `n` 为要创建 buffer 对象的个数，也就是说这个函数可以一次性创建多个缓冲区对象
- 第二个参数是一个 `GLuint` 类型的指针，用来存储返回的缓冲区对象

创建单个缓冲区对象：

```rust
let mut buf = 0;
gl::CreateBuffers(1, &mut buf);
```
创建多个缓冲区对象，第二个参数传一个数组：

```rust
let mut buf = [0u32; 3];
gl::CreateBuffers(3, buf.as_mut_ptr());  
```
OpenGL 里使用 GLuint 变量来代表通过 `glCreate...() / glGen...()` 创建的对象。

创建缓冲区对象之后，可以通过 `glBindBuffer()` 将对象绑定到当前的 OpenGL 环境中：

```c
void glBindBuffer(GLenum target, GLuint buffer);
```
- `target` 被称为绑定点（靶点）
  - 最常见的 target 应该就是 `GL_ARRAY_BUFFER` 了，将缓冲区作为顶点着色器的输入时就需要绑到这个 target 上
- `buffer` 注意类型是 GLuint， 即之前 `glCreate...() / glGen...()` 返回的 GLuint 变量（创建的对象）

```rust
let mut buf = 0;
gl::CreateBuffers(1, &mut buf);  
gl::BindBuffer(gl::ARRAY_BUFFER, buf);
```

到这里只是创建和绑定了一个缓冲区，实际上还没有分配空间:

```rust
let mut buf = 0;
gl::CreateBuffers(1, &mut buf);

let mut size = -1;
gl::GetNamedBufferParameteriv(buf, gl::BUFFER_SIZE, &mut size);

// size of buffer: 0 bytes
println!("size of buffer: {} bytes", size);
```
分配空间的操作主要是通过 `gl[Named]BufferStorage()` 来完成：

```c
void glBufferStorage(GLenum target,
                     GLsizeiptr size,
                     const GLvoid * data,
                     GLbitfield flags);
void glNamedBufferStorage(GLuint buffer,
                          GLsizei size,
                          const void *data,
                          GLbitfield flags);
```
只是第一个参数不同，`glBufferStorage()` 传入的是缓冲区的绑定点，而 `glNamedBufferStorage()` 传入缓冲区对象本身。代表缓冲区对象的 GLuint 变量称为对象的**名称**(name) 

- `size`：分配多少内存，以字节为单位
- `data`：用来初始化（复制到） buffer 的数据，可以传递 null，这样就不会复制任何数据，如果要传入 data 对 buffer 进行初始化，`data` 的大小必须大于等于 `size` 字节
- `flags`：只起到给 OpenGL 提供信息的作用，让 OpenGL 分配符合预期的内存


在分配内存后，无法再修改缓冲区的 size 和 flag 属性。只能将缓冲区销毁后重新创建。

比如要给 buffer 分配 100MB 的内存空间:

```rust
# use sb7::application::Application;
# struct App;
# 
# unsafe fn buf_test() {
  use std::ptr::null;
  let mut buf = 0;

  // 100MB = 100 * 1024 * 1024 Btye
  let size = 100 * 1024 * 1024;

#   println!("Press any key to alloc storage...");
#   std::io::stdin().read_line(&mut String::new()).unwrap();
# 
  gl::CreateBuffers(1, &mut buf);
  gl::NamedBufferStorage(buf, size as _, null(), gl::DYNAMIC_STORAGE_BIT);
# 
#   println!("Done");
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       buf_test();
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```
调用 `glNamedBufferStorage()` 之前用 nvidia-smi 查询显存：

```
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      3035      G   target/debug/test                   2MiB |
+-----------------------------------------------------------------------------+
```
调用 `glNamedBufferStorage()` 之后用 nvidia-smi 查询显存：

```
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      3035      G   target/debug/test                 102MiB |
+-----------------------------------------------------------------------------+
```

应用的显存占用从 2M 增加到了 200M，说明缓冲区对象的内存空间其实是分配内显存里的。


### 更新 buffer 缓冲区的内容

一组函数：

```c
void glBufferSubData(GLenum target,
                     GLintptr offset,
                     GLsizeiptr size,
                     const GLvoid * data);
void glNamedBufferSubData(GLuint buffer,
                          GLintptr offset,
                          GLsizei size,
                          const void *data);
```

毕竟要更新 buffer 的内容，因此在给 buffer 分配空间时，需要告诉 OpenGL 说 _这个 buffer 是可以直接更新的_ ，即在调用 `gl(Named)BufferStorage` 时，将 `GL_DYNAMIC_STORAGE_BIT` 传入 `flag` 传入函数参数。

- `offset` 参数表示要写入的起始位置，以字节为单位
- `size` 表示要写入多大的数据，以字节为单位

简单的例子，向 buffer 存入一组三角形的顶点数据：

```rust
# use sb7::application::Application;
# use std::ffi::c_void;
# use std::mem::size_of_val;
# use std::ptr::null;
# struct App;
# 
# unsafe fn buf_test() {
#  // 创建 buffer
  let mut buf = 0;
  gl::CreateBuffers(1, &mut buf);
  gl::BindBuffer(gl::ARRAY_BUFFER, buf);
# 
#   // 分配 1 KB 空间
#   // 毕竟要更新 buffer 的内容，传入 DYNAMIC_STORAGE_BIT
  gl::BufferStorage(gl::ARRAY_BUFFER, 1024, null(), gl::DYNAMIC_STORAGE_BIT);
# 
#   // 三角形的顶点数据
#   #[rustfmt::skip]
  let data = [
     0.25, -0.25, 0.5, 1.0,
    -0.25, -0.25, 0.5, 1.0,
     0.25,  0.25, 0.5, 1.0
  ];
# 
#   // 将顶点数据传入 buffer
  gl::BufferSubData(
    gl::ARRAY_BUFFER,
    0,
    size_of_val(&data) as isize,
    data.as_ptr() as *const c_void,
  );
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       buf_test();
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

### 内存映射

到此为止，还只是给 buffer 分配空间，以及更新 buffer。下面一组函数可以用来读取/更改 buffer 的内存:

```c
void *glMapBuffer(GLenum target,
                  GLenum access);
void *glMapNamedBuffer(GLuint buffer,
	                     GLenum access);

GLboolean glUnmapBuffer(GLenum target);
GLboolean glUnmapNamedBuffer(GLuint buffer);
```

将 buffer 的整个存储空间映射到客户端的内存空间上，这样就可以通过指针来读写 buffer 的内容了。`access` 有三种取值：`GL_READ_ONLY`，`GL_WRITE_ONLY`，`GL_READ_WRITE`。

对应 glBufferStorage / glNamedBufferStorage 函数的 flag 参数：

- `GL_MAP_READ_BIT`， `GL_MAP_WRITE_BIT`

当不再需要读写 buffer 时，调用 glUnmapBuffer / glUnmapNamedBuffer 来结束内存映射

读写：

```rust
# use sb7::application::Application;
# use std::ffi::c_void;
# use std::mem::size_of_val;
# use std::ptr::null;
# struct App;
# 
# unsafe fn buf_test() {
#   let mut buf = 0;
#   gl::CreateBuffers(1, &mut buf);
#   gl::NamedBufferStorage(
#     buf,
#     1024 * 1024,
#     null(),
#     gl::MAP_WRITE_BIT | gl::MAP_READ_BIT
#   );
#   
#   #[rustfmt::skip]
  let data = [ 0.25, -0.25, 0.5, 1.0,
              -0.25, -0.25, 0.5, 1.0,
              0.25,  0.25, 0.5, 1.0, ];
  let ptr = gl::MapNamedBuffer(buf, gl::WRITE_ONLY);
  copy(data.as_ptr(), ptr as *mut f64, data.len());
  gl::UnmapNamedBuffer(buf);

  let mut recv = [0.0; 12];
  let ptr = gl::MapNamedBuffer(buf, gl::READ_ONLY);
  copy(ptr as *const f64, recv.as_mut_ptr(), recv.len());
  gl::UnmapNamedBuffer(buf);
# 
#   println!("{:?}", recv);
#   // [0.25, -0.25, 0.5, 1.0, -0.25, -0.25,
#   //  0.5, 1.0, 0.25, 0.25, 0.5, 1.0]
# }
```

glMapBuffer 的开销和 buffer 的大小呈正比。毕竟映射的是整个buffer；

更加轻量：

```c
void *glMapBufferRange(GLenum target,
                       GLintptr offset,
                       GLsizeiptr length,
                       GLbitfield access);
void *glMapNamedBufferRange(GLuint buffer,
                            GLintptr offset,
                            GLsizei length,
                            GLbitfield access);
```

注意 access 的类型是 GLbitfield。

![a](./mappedrange.png)

```rust
# use gl::types::GLintptr;
# use sb7::application::Application;
# use std::ffi::c_void;
# use std::intrinsics::copy;
# use std::mem::{size_of, size_of_val};
# struct App;
# 
# #[rustfmt::skip]
# unsafe fn buf_test() {
  let mut buf = 0;
  let data = [1, 2, 3, 4, 5, 6, 7];

  gl::CreateBuffers(1, &mut buf);

  let size = size_of_val(&data) as isize;
  let data_ptr = data.as_ptr() as *const c_void;
  gl::NamedBufferStorage(buf, size, data_ptr, gl::MAP_READ_BIT);

  let mut recv = [0; 4];
#   // 偏移量：2 * 4 字节（两个 i32 变量）
  let offset = 2 * size_of::<i32>() as isize;
#   // 映射长度：4 * 4 字节（四个 i32 变量）
  let len = size_of_val(&recv) as isize;
  let ptr = gl::MapNamedBufferRange(buf, offset, len, gl::MAP_READ_BIT);
  copy(ptr as *const i32, recv.as_mut_ptr(), recv.len());
  gl::UnmapNamedBuffer(buf);
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       buf_test();
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

### 填充数据、在 buffer 间复制数据

填充：

```c
void glClearBufferSubData(GLenum target,
                          GLenum internalformat,
                          GLintptr offset,
                          GLsizeiptr size,
                          GLenum format,
                          GLenum type,
                          const void * data);
void glClearNamedBufferSubData(GLuint buffer,
                               GLenum internalformat,
                               GLintptr offset,
                               GLsizei size,
                               GLenum format,
                               GLenum type,
                               const void *data);
```

- `size`, `offset`：填充区域，字节为单位
- `type`: 传入的数据类型，取值和对应的数据类型：
  | type              | 对应的 OpenGL 类型 |
  |:------------------|:-----------------|
  | GL_BYTE           | GLchar           |
  | GL_UNSIGNED_BYTE  | GLuchar          |
  | GL_SHORT          | GLshort          |
  | GL_UNSIGNED_SHORT | GLushort         |
  | GL_INT            | GLint            |
  | GL_UNSIGNED_INT   | GLuint           |
  | GL_FLOAT          | GLfloat          |
  | GL_DOUBLE         | GLdouble         |
- `format`: 传入的数据格式：`GL_RED` `GL_RG` `GL_RGB` `GL_RGBA`：一维、二维、三维、四维
- `internalformat`：buffer 内部存储的数据格式：[gl4/glClearBufferSubData](https://docs.gl/gl4/glClearBufferSubData)


简单示例<sub>作者在整本书里就没有用过这个函数</sub>……：

```rust
# use gl::types::GLfloat;
# use sb7::application::Application;
# use std::ffi::c_void;
# use std::mem::size_of_val;
# use std::ptr::null;
# 
# unsafe fn buf_test() {
  let mut buf = 0;
  let mut recv: [GLfloat; 20] = [0.0; 20];
  let len = size_of_val(&recv) as isize;

  gl::CreateBuffers(1, &mut buf);
  gl::NamedBufferStorage(buf, len, null(),
                         gl::MAP_READ_BIT | gl::DYNAMIC_STORAGE_BIT);

  // 填充数据
  let d: [GLfloat; 4] = [1.0, 2.0, 3.0, 4.0];
  gl::ClearNamedBufferSubData(
    buf,
    gl::RGBA32F, // 内部存储格式 https://docs.gl/gl4/glClearBufferSubData
    0,           // 偏移量
    len,         // 填充长度
    gl::RGBA,    // data 格式, 如果是整形: gl::RGBA_INTEGER
#                  //  - 参见：https://github.com/d-scott-phillips/piglit/blob/2ada920d5702aa86853066559e7f941f8f5f37f2/tests/spec/arb_sparse_buffer/commit.c#L138
    gl::FLOAT,   // data 数据类型
    d.as_ptr() as *const c_void);
# 
#   let handler = gl::MapNamedBuffer(buf, gl::READ_ONLY);
#   std::intrinsics::copy(handler as *const GLfloat, recv.as_mut_ptr(), recv.len());
#   gl::UnmapNamedBuffer(buf);
# 
  // 1.0, 2.0, 3.0, 4.0, 1.0, 2.0, ...
#   println!("{:?}", recv);
# }
```

buffer 间复制，类似于 C 里的 memcpy 函数（Rust 里对应的函数为std::intrinsics::copy）:

```c
void glCopyBufferSubData(GLenum readTarget,
                         GLenum writeTarget,
                         GLintptr readOffset,
                         GLintptr writeOffset,
                         GLsizeiptr size);
void glCopyNamedBufferSubData(GLuint readBuffer,
                              GLuint writeBuffer,
                              GLintptr readOffset,
                              GLintptr writeOffset,
                              GLsizei size);
```

上面第一个函数，也就是 glCopyBufferSubData 需要两个 buffer 绑定不同的绑定点。 openGL 也提供了 GL_COPY_READ_BUFFER 和 GL_COPY_WRITE_BUFFER 这两个绑定目标，这时候就可以用上了。

```rust
# use sb7::application::Application;
# use std::ffi::c_void;
# use std::intrinsics::copy;
# use std::mem::size_of_val;
# use std::ptr::null;
# struct App;
# 
# unsafe fn buf_test() {
#   let mut bufs = [0; 2];
#   gl::CreateBuffers(2, bufs.as_mut_ptr());
#   let [read, write] = bufs;
# 
  let str = "Hello World";
  let len = size_of_val(&str) as isize;
  gl::NamedBufferStorage(read, len, str.as_ptr() as *const c_void, 
                         gl::DYNAMIC_STORAGE_BIT);
  gl::NamedBufferStorage(write, len, null(),
                         gl::DYNAMIC_STORAGE_BIT | gl::MAP_READ_BIT);

  gl::CopyNamedBufferSubData(read, write, 0, 0, len);
# 
#   let mut recv = [0u8; 1024];
#   let read_handler = gl::MapNamedBuffer(write, gl::READ_ONLY);
#   copy(read_handler as *const u8, recv.as_mut_ptr(), str.len());
#   gl::UnmapNamedBuffer(write);
#   let recv = std::str::from_utf8(&recv).unwrap().trim_matches('\u{0}');
#   assert_eq!(recv, "Hello World");
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       buf_test();
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```


## 将 buffer 数据传递到顶点着色器



新的 OpenGL 对象：顶点数组对象(vao)，用来存储顶点数组的状态。顶点数据存在另一个 buffer 对象里：顶点缓冲区对象(vbo)。

buffer 存储顶点数据（顶点的位置、颜色、法向量……等属性），vao 则管理这些存储顶点数据的 buffer。vao 作为 shader 与 buffer 的桥梁。

要从 buffer 读取顶点数据，就得创建一个 vao:

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   bufs: [GLuint; 2],
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     // 顶点属性
#     let position = [ -0.5, -0.5, 0.0, 1.0, 
#                       0.5, -0.5, 0.0, 1.0,
#                       0.0,  0.5, 0.0, 1.0f32,];
#     let color = [ 1.0, 0.0, 0.0, 1.0,
#                   0.0, 1.0, 0.0, 1.0,
#                   0.0, 0.0, 1.0, 1.0f32, ];
# 
# 
#     // 创建 vao
    let mut vao = 0;
    unsafe {
      gl::CreateVertexArrays(1, &mut vao);
      gl::BindVertexArray(vao);
    }
# 
#     // 创建 buffer，初始化 buffer
#     let mut bufs = [0; 2];
#     unsafe {
#       gl::CreateBuffers(2, bufs.as_mut_ptr());
#       gl::BindBuffer(gl::VERTEX_ARRAY, bufs[0]);
#       gl::BindBuffer(gl::VERTEX_ARRAY, bufs[1]);
#       gl::NamedBufferStorage(bufs[0], size_of_val(&position) as isize,
#                              position.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
#       gl::NamedBufferStorage(bufs[1], size_of_val(&color) as isize,
#                              color.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
# 
#     }
# 
#     // 绑定 buffer 与 vao
#     unsafe {
#       gl::VertexArrayVertexBuffer(vao, 0, bufs[0], 0,
#                                   (size_of::<f32>() * 4) as i32);
#       gl::VertexArrayVertexBuffer(vao, 1, bufs[1], 0,
#                                   (size_of::<f32>() * 4) as i32);
#     }
# 
#     // 设置顶点属性对应的 buffer
#     unsafe {
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::VertexArrayAttribBinding(vao, 1, 1);
#     }
# 
#     // 设置顶点属性的格式
#     unsafe {
#       gl::VertexArrayAttribFormat(vao, 0,
#                                   4,
#                                   gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribFormat(vao, 1,
#                                   4,
#                                   gl::FLOAT, gl::FALSE, 0);
#     }
# 
#     // 启用顶点属性
#     unsafe {
#       gl::EnableVertexArrayAttrib(vao, 0);
#       gl::EnableVertexArrayAttrib(vao, 1);  
#     }
# 
#     let program = unsafe {
#       // 创建顶点着色器
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec4 position;
#         layout (location = 1) in vec4 color;
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = position;
#           vs_color = color;
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#       
#       // 创建片段着色器
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       // 创建着色器程序
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       // 启用着色器程序
#       gl::UseProgram(program);
#       program
#     };
# 
#     *self = Self { vao, program, bufs };
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, self.bufs.as_ptr());
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

建立顶点着色器内部顶点属性与 buffer 的关系，将下标为 bindingindex 的 buffer 内部数据作为顶点属性 attribindex 的输入：

```c
void glVertexArrayAttribBinding(GLuint vaobj,
                                GLuint attribindex,
                                GLuint bindingindex);
```

- `attribindex` 顶点属性的下标（shader 里指定)
- `bindingindex` vao绑定的顶点缓冲区对象下标，这个 buffer 存放一个顶点属性的数据

对应的 buffer 必须通过 glVertexArrayVertexBuffer 函数挂载到 vao 上：

```c
void glVertexArrayVertexBuffer(GLuint vaobj,
                               GLuint bindingindex,
                               GLuint buffer,
                               GLintptr offset,
                               GLsizei stride);
```

- vaobj: 与 buffer 绑定的 vao
- buffer: 与 vao 相绑定的 buffer
- offset: 偏移量（起始位置），字节为单位 shader 从什么地方开始读数据
- stride: 每个顶点属性的大小

使用方法：

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   bufs: [GLuint; 2],
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     // 顶点属性
    let position = [ -0.5, -0.5, 0.0, 1.0, 
                      0.5, -0.5, 0.0, 1.0,
                      0.0,  0.5, 0.0, 1.0f32,];
    let color = [ 1.0, 0.0, 0.0, 1.0,
                  0.0, 1.0, 0.0, 1.0,
                  0.0, 0.0, 1.0, 1.0f32, ];
# 
# 
#     // 创建 vao
#     let mut vao = 0;
#     unsafe {
#       gl::CreateVertexArrays(1, &mut vao);
#       gl::BindVertexArray(vao);
#     }
# 
#     // 创建 buffer，初始化 buffer
    let mut bufs = [0; 2];
#     unsafe {
      gl::CreateBuffers(2, bufs.as_mut_ptr());
      gl::BindBuffer(gl::VERTEX_ARRAY, bufs[0]);
      gl::BindBuffer(gl::VERTEX_ARRAY, bufs[1]);
#       gl::NamedBufferStorage(bufs[0], size_of_val(&position) as isize,
#                              position.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
#       gl::NamedBufferStorage(bufs[1], size_of_val(&color) as isize,
#                              color.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
# 
#     }
# 
#     // 绑定 buffer 与 vao
#     unsafe {
      gl::VertexArrayVertexBuffer(vao, 0, bufs[0], 0,
                                  (size_of::<f32>() * 4) as i32);
      gl::VertexArrayVertexBuffer(vao, 1, bufs[1], 0,
                                  (size_of::<f32>() * 4) as i32);
#     }
# 
#     // 设置顶点属性对应的 buffer
#     unsafe {
      gl::VertexArrayAttribBinding(vao, 0, 0);
      gl::VertexArrayAttribBinding(vao, 1, 1);
#     }
# 
#     // 设置顶点属性的格式
#     unsafe {
#       gl::VertexArrayAttribFormat(vao, 0,
#                                   4,
#                                   gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribFormat(vao, 1,
#                                   4,
#                                   gl::FLOAT, gl::FALSE, 0);
#     }
# 
#     // 启用顶点属性
#     unsafe {
#       gl::EnableVertexArrayAttrib(vao, 0);
#       gl::EnableVertexArrayAttrib(vao, 1);  
#     }
# 
#     let program = unsafe {
#       // 创建顶点着色器
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec4 position;
#         layout (location = 1) in vec4 color;
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = position;
#           vs_color = color;
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#       
#       // 创建片段着色器
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       // 创建着色器程序
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       // 启用着色器程序
#       gl::UseProgram(program);
#       program
#     };
# 
#     *self = Self { vao, program, bufs };
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, self.bufs.as_ptr());
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

在通过 vao 搭建好 buffer 与顶点属性的桥梁之后，还需要给 OpenGL 说明顶点属性的格式，即说明一个顶点属性由几个元素组成，每个元素的数据类型是什么，以及其他配置：

```c
void glVertexArrayAttribFormat(GLuint vaobj,
                               GLuint attribindex,
                               GLint size,
                               GLenum type,
                               GLboolean normalized,
                               GLuint relativeoffset);
```

- size: 这个顶点属性由几个数组成
  - 颜色、位置：4 （rgba, xyzw）

- type: 数据类型：GL::FLOAT, GL::UCHAT 等

- normalized: 在传入着色器之前，是否对数据进行正规化处理
  只对整数数据有效，浮点数不会进行正规化
  - 无符号整数转换成 \[0.0~1.0\] 的浮点数
  - 有符号整数转换成 \[-1.0~1.0\] 的浮点数

- relativeoffset： 相对偏移量

第 n 个顶点在 buffer 内部的读取位置和offset, relativeoffset 的关系：

```
location = offset + n * stride + relativeoffset
```

在设置完顶点属性的格式后，就可以调用 `glEnableVertexArrayAttrub()` 来启用之前的配置了：

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   bufs: [GLuint; 2],
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     // 顶点属性
#     let position = [ -0.5, -0.5, 0.0, 1.0, 
#                       0.5, -0.5, 0.0, 1.0,
#                       0.0,  0.5, 0.0, 1.0f32,];
#     let color = [ 1.0, 0.0, 0.0, 1.0,
#                   0.0, 1.0, 0.0, 1.0,
#                   0.0, 0.0, 1.0, 1.0f32, ];
# 
# 
#     // 创建 vao
#     let mut vao = 0;
#     unsafe {
#       gl::CreateVertexArrays(1, &mut vao);
#       gl::BindVertexArray(vao);
#     }
# 
#     // 创建 buffer，初始化 buffer
#     let mut bufs = [0; 2];
#     unsafe {
#       gl::CreateBuffers(2, bufs.as_mut_ptr());
#       gl::BindBuffer(gl::VERTEX_ARRAY, bufs[0]);
#       gl::BindBuffer(gl::VERTEX_ARRAY, bufs[1]);
#       gl::NamedBufferStorage(bufs[0], size_of_val(&position) as isize,
#                              position.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
#       gl::NamedBufferStorage(bufs[1], size_of_val(&color) as isize,
#                              color.as_ptr() as *const c_void,
#                              gl::DYNAMIC_STORAGE_BIT);
# 
#     }
# 
#     // 绑定 buffer 与 vao
#     unsafe {
#       gl::VertexArrayVertexBuffer(vao, 0, bufs[0], 0,
#                                   (size_of::<f32>() * 4) as i32);
#       gl::VertexArrayVertexBuffer(vao, 1, bufs[1], 0,
#                                   (size_of::<f32>() * 4) as i32);
#     }
# 
#     // 设置顶点属性对应的 buffer
#     unsafe {
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::VertexArrayAttribBinding(vao, 1, 1);
#     }
# 
#     // 设置顶点属性的格式
#     unsafe {
      gl::VertexArrayAttribFormat(vao, 0, 4, gl::FLOAT, gl::FALSE, 0);
      gl::VertexArrayAttribFormat(vao, 1, 4, gl::FLOAT, gl::FALSE, 0);
#     }
# 
#     // 启用顶点属性
#     unsafe {
      gl::EnableVertexArrayAttrib(vao, 0);
      gl::EnableVertexArrayAttrib(vao, 1);  
#     }
# 
#     let program = unsafe {
#       // 创建顶点着色器
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec4 position;
#         layout (location = 1) in vec4 color;
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = position;
#           vs_color = color;
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#       
#       // 创建片段着色器
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       // 创建着色器程序
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       // 启用着色器程序
#       gl::UseProgram(program);
#       program
#     };
# 
#     *self = Self { vao, program, bufs };
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, self.bufs.as_ptr());
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

完整的配置过程如下：

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   bufs: [GLuint; 2],
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      // 顶点属性
      let position = [ -0.5, -0.5, 0.0, 1.0, 
                        0.5, -0.5, 0.0, 1.0,
                        0.0,  0.5, 0.0, 1.0f32,];
      let color = [ 1.0, 0.0, 0.0, 1.0,
                    0.0, 1.0, 0.0, 1.0,
                    0.0, 0.0, 1.0, 1.0f32, ];
# 
      let mut vao = 0;
      let mut bufs = [0; 2];
      gl::CreateVertexArrays(1, &mut vao);
      gl::CreateBuffers(2, bufs.as_mut_ptr());
#       
      // 将顶点的位置属性复制到 buffer 里
      gl::NamedBufferStorage(bufs[0], size_of_val(&position) as isize,
                            position.as_ptr() as *const c_void,
                            gl::DYNAMIC_STORAGE_BIT);
#       
      // 将 buffer 挂载到 vao 上
      // offset = 0, stride = suzeof([f32; 4])
      gl::VertexArrayVertexBuffer(vao, 0, bufs[0], 0,
                                  size_of::<[f32; 4]>() as i32);
#       
      // 配置顶点属性的格式
      gl::VertexArrayAttribFormat(vao, 0, 4, gl::FLOAT, gl::FALSE, 0);
# 
      // 从哪个 buffer 作为顶点属性的输入
      gl::VertexArrayAttribBinding(vao, 0, 0);
# 
      // 配置完成
      gl::EnableVertexArrayAttrib(vao, 0);

      // 配置第二个顶点属性
      gl::NamedBufferStorage(bufs[1], size_of_val(&color) as isize,
                            color.as_ptr() as *const c_void,
                            gl::DYNAMIC_STORAGE_BIT);
      gl::VertexArrayVertexBuffer(vao, 1, bufs[1], 0,
                                  size_of::<[f32; 4]>() as i32);
      gl::VertexArrayAttribBinding(vao, 1, 1);
      gl::VertexArrayAttribFormat(vao, 1, 4, gl::FLOAT, gl::FALSE, 0);
      gl::EnableVertexArrayAttrib(vao, 1);  
# 
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec4 position;
#         layout (location = 1) in vec4 color;
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = position;
#           vs_color = color;
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       gl::UseProgram(program);
# 
#       *self = Self { vao, program, bufs };
# 
#       gl::BindVertexArray(vao);
#     }
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, self.bufs.as_ptr());
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

也可以将顶点属性放到一个结构体里，然后存到一个 buffer 上：

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   buf: GLuint,
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     #[allow(dead_code)]
    struct Vertex {
      x: f32, y: f32, z: f32, // position
      r: f32, g: f32, b: f32, // color
    }
# 
    let vertices = [
      Vertex { x: -0.5, y: -0.5, z: 0.0, r: 1.0, g: 0.0, b: 0.0 },
#       Vertex { x:  0.5, y: -0.5, z: 0.0, r: 0.0, g: 1.0, b: 0.0 },
#       Vertex { x:  0.0, y:  0.5, z: 0.0, r: 0.0, g: 0.0, b: 1.0 },
    ];
#   
#     unsafe {
      let mut vao = 0;
      gl::CreateVertexArrays(1, &mut vao);
      
      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);
      
      gl::NamedBufferStorage(buf, size_of_val(&vertices) as isize,
                             vertices.as_ptr() as *const c_void,
                             gl::DYNAMIC_STORAGE_BIT);
      gl::VertexArrayVertexBuffer(vao, 0, buf, 0, size_of::<Vertex>() as i32);
      gl::VertexArrayAttribFormat(vao, 0, 3, gl::FLOAT, gl::FALSE, 0);
      gl::VertexArrayAttribFormat(vao, 1, 3, gl::FLOAT, gl::FALSE,
                                  3 * size_of::<f32>() as u32);
      gl::VertexArrayAttribBinding(vao, 0, 0);
      gl::VertexArrayAttribBinding(vao, 1, 0);
      gl::EnableVertexArrayAttrib(vao, 0);
      gl::EnableVertexArrayAttrib(vao, 1);
# 
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec3 position;
#         layout (location = 1) in vec3 color;
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = vec4(position, 1.0);
#           vs_color = vec4(color, 1.0);
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       gl::UseProgram(program);
# 
#       *self = Self { vao, program, buf };
# 
#       gl::BindVertexArray(vao);
#     }
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, &self.buf);
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

### Uniform 变量

- 可以在应用程序内将数据直接传递给 shader

在 shader 里声明 uniform 变量：

```glsl
uniform float time;
uniform int index;
uniform vec4 color;
uniform mat4 vpmat;
```

uniform 变量需要在 C++ / Rust 代码里传入数据，glsl 内不能对 uniform 变量赋值。

但是可以在声明的时候可以赋初值：

```glsl
uniform float a = 12;
```

### 向 uniform 变量传递数据

调用 `glGetUniformLocation()`  查询 uniform 变量的位置，之后就可调用一系列 `glUniform*` 函数来给 uniform 变量传递数据：

`glUniform*` 函数的原型，完整：[glUniform](/gl4/glUniform)
 
```c
void glUniform1f(GLint location,
                 GLfloat v0);
void glUniform2f(GLint location,
                 GLfloat v0,
                 GLfloat v1);
...
```

这里的 location 参数需要调用 `glGetUniformLocation` 来查询：

```c
GLint glGetUniformLocation(GLuint program,
                           const GLchar *name);
```

glsl定义 uniform 变量：

```glsl
uniform float time;
uniform vec3 offset;
```

在 Rust 里给这两个 uniform 变量赋值：

```rust
let name = CString::new("time").unwrap();
let ltime = gl::GetUniformLocation(program, name.as_ptr());
gl::Uniform1f(ltime, 1.0);

let name = CString::new("offset").unwrap();
let loffset = gl::GetUniformLocation(program, name.as_ptr());
gl::Uniform3f(loffset, 1.0, 2.0, 3.0);
```

也可以在 glsl 里指定 uniform 变量的 location:

```glsl
layout (location = 0) uniform float time;
layout (location = 1) uniform int index;
layout (location = 2) uniform vec4 color;
layout (location = 3) uniform bool flag;
```

传递数据：

```rust
gl::Uniform1f(0, 1.0);
gl::Uniform1i(1, 2);
gl::Uniform3f(2, 3.0, 4.0, 5.0);
gl::Uniform1i(3, gl::FALSE);
```

`glUniform*()` 有一组以 `v` 作为后缀的函数，可以传入指向数据的指针：

```c
void glUniform3fv(GLint location,
                  GLsizei count,
                  const GLfloat *value);
void glUniform4fv(GLint location,
                  GLsizei count,
                  const GLfloat *value);
```

给 vec4 变量传递数据：

```glsl glsl:
uniform vec4 vcolor;
```

```rust rust:
let vcolor = [1.0, 1.0, 1.0, 1.0];
gl::Uniform4fv(vcolor_location, 1, vcolor.as_ptr());
```

给 vec4数组传递数据：

```glsl glsl, 顶点着色器:
# #version 460 core
# layout (location = 0) in vec3 position;
# out vec4 vs_color;
# 
uniform vec4 colors[3];
# 
# void main() {
#   gl_Position = vec4(position, 1.0);
#   vs_color = colors[gl_VertexID];
# }
```

```rust rust:
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   buf: GLuint,
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     let positions = [ -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.0, 0.5, 0.0f32,];
# 
#     unsafe {
#       let mut vao = 0;
#       gl::CreateVertexArrays(1, &mut vao);
#       
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       
#       gl::NamedBufferStorage(buf, size_of_val(&positions) as isize,
#                             positions.as_ptr() as *const c_void,
#                             gl::DYNAMIC_STORAGE_BIT);
#       gl::VertexArrayVertexBuffer(vao, 0, buf, 0,
#                                     size_of::<[f32; 3]>() as i32);
#       gl::VertexArrayAttribFormat(vao, 0, 3, gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::EnableVertexArrayAttrib(vao, 0);
# 
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec3 position;
#         out vec4 vs_color;
# 
#         uniform vec4 colors[3];
# 
#         void main() {
#           gl_Position = vec4(position, 1.0);
#           vs_color = colors[gl_VertexID];
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       gl::UseProgram(program);
# 
#       *self = Self { vao, program, buf };
# 
#       gl::BindVertexArray(vao);
# 
      let colors = [[0.0, 0.0, 1.0, 1.0],
                    [0.0, 1.0, 0.0, 1.0],
                    [1.0, 0.0, 0.0, 1.0f32],];
#       let name = CString::new("colors").unwrap();
#       let colors_location = gl::GetUniformLocation(program, name.as_ptr());
      gl::Uniform4fv(colors_location, 3, colors.as_ptr() as *const f32);
#       
#     }
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, &self.buf);
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

传一维数据：

```rust
let data = 1.0f32;
gl::Uniform1fv(data_location, 1, &data);
```

传递矩阵：

```glsl 顶点着色器:
# #version 460 core
# layout (location = 0) in vec3 position;
# layout (location = 1) in vec3 color;
# 
uniform mat4 mv_mat = mat4(1.0);
# 
# out vec4 vs_color;
# 
# void main() {
#   gl_Position = mv_mat * vec4(position, 1.0);
#   vs_color = vec4(color, 1.0);
# }
```

```rust rust:
# use gl::types::GLuint;
# use sb7::application::Application;
# use sb7::vmath::rotate;
# use std::ffi::{c_void, CString};
# use std::mem::{size_of_val, size_of};
# use std::ptr::{null, addr_of};
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   buf: GLuint,
#   program: GLuint
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     #[allow(dead_code)]
#     struct Vertex {
#       x: f32, y: f32, z: f32, // position
#       r: f32, g: f32, b: f32, // color
#     }
# 
#     let vertices = [
#       Vertex { x: -0.5, y: -0.5, z: 0.0, r: 1.0, g: 0.0, b: 0.0 },
#       Vertex { x:  0.5, y: -0.5, z: 0.0, r: 0.0, g: 1.0, b: 0.0 },
#       Vertex { x:  0.0, y:  0.5, z: 0.0, r: 0.0, g: 0.0, b: 1.0 },
#     ];
#   
#     unsafe {
#       let mut vao = 0;
#       gl::CreateVertexArrays(1, &mut vao);
#       
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       
#       gl::NamedBufferStorage(buf, size_of_val(&vertices) as isize,
#                             vertices.as_ptr() as *const c_void,
#                             gl::DYNAMIC_STORAGE_BIT);
#       gl::VertexArrayVertexBuffer(vao, 0, buf, 0, size_of::<Vertex>() as i32);
#       gl::VertexArrayAttribFormat(vao, 0, 3, gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribFormat(vao, 1, 3, gl::FLOAT, gl::FALSE, 3 * size_of::<f32>() as u32);
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::VertexArrayAttribBinding(vao, 1, 0);
#       gl::EnableVertexArrayAttrib(vao, 0);
#       gl::EnableVertexArrayAttrib(vao, 1);
# 
#       let vs_source = CString::new("
#         #version 460 core
#         layout (location = 0) in vec3 position;
#         layout (location = 1) in vec3 color;
# 
#         uniform mat4 mv_mat = mat4(1.0);
# 
#         out vec4 vs_color;
# 
#         void main() {
#           gl_Position = mv_mat * vec4(position, 1.0);
#           vs_color = vec4(color, 1.0);
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
#         in vec4 vs_color;
#         out vec4 fs_color;
# 
#         void main() {
#           fs_color = vs_color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       gl::UseProgram(program);
# 
#       *self = Self { vao, program, buf };
# 
#       gl::BindVertexArray(vao);
#     }
#   }
# 
#   fn render(&self, _current_time: f64) {
#     unsafe {
      let mv_mat = rotate(0.0, _current_time as f32 * 45.0, 0.0);
#       let name = CString::new("mv_mat").unwrap();
#       let location_mv_mat = gl::GetUniformLocation(self.program,
#                                                    name.as_ptr() as _);
      gl::UniformMatrix4fv(location_mv_mat, 1,
                           gl::FALSE, addr_of!(mv_mat) as _);
# 
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, &self.buf);
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```
对应的效果如下：

{% raw %}
<div class="demo_app" id="_ch5_1_0_uniform_mat"></div>
{% endraw %}

#### 通过 uniform 变量设置变换矩阵

初始化顶点数据：

```rust
# use gl::types::*;
# use sb7::application::{Application, AppConfig};
# use sb7::mat4;
# use sb7::vmath::{Mat4, translate, rotate_with_axis};
# use std::ffi::CString;
# use std::mem::size_of_val;
# use std::ptr::{null, addr_of};
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   buf: GLuint,
#   program: GLuint,
#   proj_matrix: Mat4,
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     #[rustfmt::skip]
    let vertex_position : &[f32]= &[
      -0.25,  0.25, -0.25,
      -0.25, -0.25, -0.25,
       0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25,  0.25, -0.25,
#       -0.25,  0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25, -0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#       -0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25,  0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#        0.25, -0.25,  0.25,
#        0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#       -0.25, -0.25, -0.25,
#       -0.25, -0.25,  0.25,
# 
#       -0.25,  0.25, -0.25,
#        0.25,  0.25, -0.25,
#        0.25,  0.25,  0.25,
# 
      // ...
       0.25,  0.25,  0.25,
      -0.25,  0.25,  0.25,
      -0.25,  0.25, -0.25
    ];
# 
#     unsafe {
      let mut vao = 0;
      gl::CreateVertexArrays(1, &mut vao);
      gl::BindVertexArray(vao);

      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);
      gl::BindBuffer(gl::ARRAY_BUFFER, buf);
      gl::NamedBufferData(buf,
                          size_of_val(vertex_position) as _,
                          vertex_position.as_ptr() as _,
                          gl::STATIC_DRAW);
      gl::VertexAttribPointer(0, 3, gl::FLOAT, gl::FALSE, 0, null());
      gl::EnableVertexArrayAttrib(vao, 0);
# 
#       let vs_source = CString::new("
#         #version 460 core
# 
#         in vec4 position;
#         
#         out VS_OUT {
#           vec4 color;
#         } vs_out;
# 
#         layout (location = 0) uniform mat4 mv_matrix = mat4(1.0);
#         layout (location = 1) uniform mat4 proj_matrix = mat4(1.0);
# 
#         void main() {
#           gl_Position =  proj_matrix * mv_matrix * position;
#           vs_out.color = position * 2.0 + vec4(0.5, 0.5, 0.5, 0.0);
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
# 
#         out vec4 color;
#         
#         in VS_OUT {
#           vec4 color;
#         } fs_in;
# 
#         void main() {
#           color = fs_in.color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
#       gl::UseProgram(program);
# 
#       gl::Enable(gl::DEPTH_TEST);
#       *self = Self { vao, program, buf, proj_matrix: mat4!() };
#     }
# 
#     let AppConfig { width, height, .. } = AppConfig::default();
#     self.on_resize(width as _, height as _);
#   }
# 
#   fn render(&self, current_time: f64) {
#     unsafe {
#       let current_time = current_time as f32;
#       let f = current_time * 0.3;
#       let mv_matrix = translate(0.0, 0.0, -4.0) *
#                       translate((2.1 * f).sin() * 0.5,
#                                 (1.7 * f).cos() * 0.5,
#                                 (1.3 * f).sin() * (1.5 * f).cos() * 2.0) *
#                       rotate_with_axis(current_time * 45.0, 0.0, 1.0, 0.0) *
#                       rotate_with_axis(current_time * 81.0, 1.0, 0.0, 0.0);
#       gl::UniformMatrix4fv(0, 1, gl::FALSE, addr_of!(mv_matrix) as _);
#       
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
#       gl::DrawArrays(gl::TRIANGLES, 0, 36);
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as GLfloat / h as GLfloat;
#     self.proj_matrix = sb7::vmath::perspective(50.0, aspect, 0.1, 1000.0);
#     unsafe {
#       gl::UniformMatrix4fv(1, 1, gl::FALSE, addr_of!(self.proj_matrix) as _);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, &self.buf);
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

设置变换矩阵：

```rust
# ...
#   fn render(&self, current_time: f64) {
#     unsafe {
#       let current_time = current_time as f32;
      let f = current_time * 0.3;
      let mv_matrix = translate(0.0, 0.0, -4.0) *
                      translate((2.1 * f).sin() * 0.5,
                                (1.7 * f).cos() * 0.5,
                                (1.3 * f).sin() * (1.5 * f).cos() * 2.0) *
                      rotate_with_axis(current_time * 45.0, 0.0, 1.0, 0.0) *
                      rotate_with_axis(current_time * 81.0, 1.0, 0.0, 0.0);
#       gl::UniformMatrix4fv(0, 1, gl::FALSE, addr_of!(mv_matrix) as _);
#       
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
#       gl::DrawArrays(gl::TRIANGLES, 0, 36);
#     }
#   }
# ...
```

在窗口大小发生改变时，更新投影矩阵：

```rust
# ...
  fn on_resize(&mut self, w: i32, h: i32) {
    let aspect = w as GLfloat / h as GLfloat;
    self.proj_matrix = sb7::vmath::perspective(50.0, aspect, 0.1, 1000.0);
#     unsafe {
#       gl::UniformMatrix4fv(1, 1, gl::FALSE, addr_of!(self.proj_matrix) as _);
#     }
  }
# ...
```

将变换矩阵和投影矩阵传递到shader里：

```rust
# impl Application for App {
#   fn startup(&mut self) {
#       // ...
#     self.on_resize(width as _, height as _);
#   }
# 
#   fn render(&self, current_time: f64) {
#     unsafe {
#       let current_time = current_time as f32;
#       let f = current_time * 0.3;
#       let mv_matrix = translate(0.0, 0.0, -4.0) *
#                       translate((2.1 * f).sin() * 0.5,
#                                 (1.7 * f).cos() * 0.5,
#                                 (1.3 * f).sin() * (1.5 * f).cos() * 2.0) *
#                       rotate_with_axis(current_time * 45.0, 0.0, 1.0, 0.0) *
#                       rotate_with_axis(current_time * 81.0, 1.0, 0.0, 0.0);
      gl::UniformMatrix4fv(0, 1, gl::FALSE, addr_of!(mv_matrix) as _);
#       
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
#       gl::DrawArrays(gl::TRIANGLES, 0, 36);
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as GLfloat / h as GLfloat;
#     self.proj_matrix = sb7::vmath::perspective(50.0, aspect, 0.1, 1000.0);
#     unsafe {
      gl::UniformMatrix4fv(1, 1, gl::FALSE, addr_of!(self.proj_matrix) as _);
#     }
#   }
# 
#   fn shutdown(&self) {
#       // ...
#   }
# }
```

顶点着色器：

```glsl
#version 460 core

in vec4 position;

out VS_OUT {
  vec4 color;
} vs_out;

layout (location = 0) uniform mat4 mv_matrix = mat4(1.0);
layout (location = 1) uniform mat4 proj_matrix = mat4(1.0);

void main() {
  gl_Position =  proj_matrix * mv_matrix * position;
  vs_out.color = position * 2.0 + vec4(0.5, 0.5, 0.5, 0.0);
}
```

片段着色器：

```glsl
#version 460 core

out vec4 color;

in VS_OUT {
  vec4 color;
} fs_in;

void main() {
  color = fs_in.color;
}
```

{% raw %}
<div class="demo_app" id="_ch5_2_spinningcube"></div>
{% endraw %}

绘制多个物体：在 render 函数里多次调用 `glDrawArray` 就行：

```rust
# use gl::types::*;
# use sb7::application::{Application, AppConfig};
# use sb7::mat4;
# use sb7::vmath::{Mat4, translate, rotate_with_axis};
# use std::ffi::CString;
# use std::mem::size_of_val;
# use std::ptr::{null, addr_of};
# 
# #[derive(Default)]
# struct App {
#   vao: GLuint,
#   buf: GLuint,
#   program: GLuint,
#   proj_matrix: Mat4,
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     #[rustfmt::skip]
#     let vertex_position : &[f32]= &[
#       -0.25,  0.25, -0.25,
#       -0.25, -0.25, -0.25,
#        0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25,  0.25, -0.25,
#       -0.25,  0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25, -0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#       -0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25,  0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#        0.25, -0.25,  0.25,
#        0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#       -0.25, -0.25, -0.25,
#       -0.25, -0.25,  0.25,
# 
#       -0.25,  0.25, -0.25,
#        0.25,  0.25, -0.25,
#        0.25,  0.25,  0.25,
# 
#        0.25,  0.25,  0.25,
#       -0.25,  0.25,  0.25,
#       -0.25,  0.25, -0.25
#     ];
# 
#     unsafe {
#       let mut vao = 0;
#       gl::CreateVertexArrays(1, &mut vao);
#       gl::BindVertexArray(vao);
# 
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       gl::BindBuffer(gl::ARRAY_BUFFER, buf);
#       gl::NamedBufferData(buf,
#                           size_of_val(vertex_position) as _,
#                           vertex_position.as_ptr() as _,
#                           gl::STATIC_DRAW);
#       gl::VertexAttribPointer(0, 3, gl::FLOAT, gl::FALSE, 0, null());
#       gl::EnableVertexArrayAttrib(vao, 0);
# 
#       let vs_source = CString::new("
#         #version 460 core
# 
#         in vec4 position;
#         
#         out VS_OUT {
#           vec4 color;
#         } vs_out;
# 
#         layout (location = 0) uniform mat4 mv_matrix = mat4(1.0);
#         layout (location = 1) uniform mat4 proj_matrix = mat4(1.0);
# 
#         void main() {
#           gl_Position =  proj_matrix * mv_matrix * position;
#           vs_out.color = position * 2.0 + vec4(0.5, 0.5, 0.5, 0.0);
#         }
#       ").unwrap();
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_source.as_ptr(), null());
#       gl::CompileShader(vs);
#         
#       let fs_source = CString::new("
#         #version 460 core
# 
#         out vec4 color;
#         
#         in VS_OUT {
#           vec4 color;
#         } fs_in;
# 
#         void main() {
#           color = fs_in.color;
#         }
#       ").unwrap();
#       let fs = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs, 1, &fs_source.as_ptr(), null());
#       gl::CompileShader(fs);
# 
#       let program = gl::CreateProgram();
#       gl::AttachShader(program, vs);
#       gl::AttachShader(program, fs);
#       gl::LinkProgram(program);
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs);
# 
      gl::UseProgram(program);
# 
#       gl::Enable(gl::DEPTH_TEST);
#       *self = Self { vao, program, buf, proj_matrix: mat4!() };
#     }
# 
#     let AppConfig { width, height, .. } = AppConfig::default();
#     self.on_resize(width as _, height as _);
#   }
# 
#   fn render(&self, current_time: f64) {
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
# 
      let current_time = current_time as f32;
# 
      for i in 0..24 {
        let f = i as f32 + current_time * 0.3;

        let mv_matrix = translate(0.0, 0.0, -6.0)
             * rotate_with_axis(current_time * 45.0, 0.0, 1.0, 0.0)
             * rotate_with_axis(current_time * 21.0, 1.0, 0.0, 0.0)
             * translate((2.1 * f).sin() * 2.0,
                         (1.7 * f).cos() * 2.0,
                         (1.3 * f).sin() * (1.5 * f).cos() * 2.0);
        gl::UniformMatrix4fv(0, 1, gl::FALSE, addr_of!(mv_matrix) as _);

        gl::DrawArrays(gl::TRIANGLES, 0, 36);
      }
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as GLfloat / h as GLfloat;
#     self.proj_matrix = sb7::vmath::perspective(50.0, aspect, 0.1, 1000.0);
#     unsafe {
#       gl::UniformMatrix4fv(1, 1, gl::FALSE, addr_of!(self.proj_matrix) as _);
#     }
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteBuffers(2, &self.buf);
#       gl::DeleteProgram(self.program);
#       gl::DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }

```

{% raw %}
<div class="demo_app" id="_ch5_3_spinningcubes"></div>
{% endraw %}

#### Uniform 块

过多的 uniform 变量意味着将会有很多散落在各处的`glUniform*()` 函数（难以维护）。将 uniform 变量塞到一个块结构(uniform 块)里，而要传入的数据存储在 buffer 对象中。

用来存储 uniform 块数据的 buffer 对象被成为 UBO (uniform 缓冲区对象)

##### 声明

格式大概是这样：

```glsl
uniform [块名] {
  // ... 成员变量
} [实例名];
```
```glsl
uniform TransformBlock
{
  float scale;
  vec3 transition;
  float rotate[3];
  mat4 proj_matrix;
} transform;

```

访问成员：`transform.scale`， ... 和结构体类似

如果要定义多个 `TransformBlock` 块实例的话，这样子是不行的：

```glsl
// ERROR
uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} trans1, trans2;
```

只能定义成一个数组：

```glsl
#version 460 core
uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms[2];
```

这样子就可以给 transforms[0] 和 transforms[1] 分配不同的 buffer 。

访问属性：

```glsl
gl_Position =  transforms[0].projection_matrix * vec4(0.0);
```

##### UBO的内存格式

用来存储 uniform 块内数据的 buffer：UBO。数据在 buffer 内部的布局方式，可以自行取舍：

- 标准布局：
  - 数据类型的大小 N 字节，则数据的存储位置为 N 字节的整数倍：
    - int float bool：在 glsl 占用 4 字节，在 buffer 存储地址为 4 的整数倍
  - 数据类型的大小 N 字节，则二维向量 与 2 * N 字节对齐
    - vec2 的存储位置与 2 * 4 = 8 字节对齐
  - 数据类型的大小 N 字节，三维、四维向量与 4 * N 字节对齐
    - vec3, vec4 的存储位置与 16字节对齐
  - 数组：每个元素和 4 * N 字节对齐

参考：[OpenGL 4.6规范](https://www.khronos.org/registry/OpenGL/specs/gl/glspec46.core.pdf) `7.6.2.2 Standard Uniform Block Layout`

使用标准布局：在 uniform 关键字前加上 `layout(std140)`进行修饰

```glsl
layout(std140) uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms;
```

内存布局如下：

- scale 的起始位置为 0 字节，占用 4 字节
- translation：类型为 vec3，与 16 字节对齐，因此起始位置为 16 字节，占用 4 * 3 = 12 字节
- rotate：每个元素与 16 字节对齐：
  - rotate[0]：起始位置为 32 字节
  - rotate[1]：起始位置为 48 字节
  - rotate[2]：起始位置为 64 字节
- mat4：可以看成 vec4 数组，每个元素与 16 字节对齐

可以设置 uniform 块内部成员的偏移量：

```glsl
layout(std140) uniform ManuallyLaidOutBlock {
  layout (offset = 8) vec2 bar;
  layout (offset = 32) vec3 foo;
  layout (offset = 48) vec3 baz;
} myBlock;
```

指定成员的对齐位置时，成员的起始位置要满足上面的规则，如果不满足的话 shader 会编译失败：

```glsl shader:
# #version 460 core
layout(std140) uniform ManuallyLaidOutBlock {
  layout (offset = 7) vec2 bar;
  layout (offset = 15) vec3 foo;
  layout (offset = 48) vec3 baz;
} myBlock;
# void main() { }
```
```txt 错误输出
== 0:3(27): error: layout qualifier offset must be a multiple of the base alignment of vec2
== 0:4(28): error: layout qualifier offset must be a multiple of the base alignment of vec3
== 0:6(4): error: invalid qualifier xfb_offset=7 must be a multiple of the first component size of the first qualified variable or block member. Or double if an aggregate that contains a double (4).
== 0:6(4): error: invalid qualifier xfb_offset=15 must be a multiple of the first component size of the first qualified variable or block member. Or double if an aggregate that contains a double (4).
```

成员的顺序也很重要，前一个成员的内存位置必须小于后一个成员的位置：

```glsl shader
# #version 460 core
layout(std140) uniform ManuallyLaidOutBlock {
  layout (offset = 16) vec3 foo;
  layout (offset = 8) vec2 bar;
  layout (offset = 48) vec3 baz;
} myBlock;
# void main() { }
```
```txt 错误信息：
== 0:4(27): error: layout qualifier offset overlaps previous member
```

设置最小对齐间隔：

```glsl
layout(std140, align = 16) uniform ManuallyLaidOutBlock {
  layout (offset = 8) vec2 bar;   // At offset 16 bytes
  layout (offset = 32) vec3 foo;  // At offset 32 bytes
  layout (offset = 48) vec3 baz;  // At offset 48 bytes
} myBlock;
```

- 共享布局

OpenGL 使用的默认布局，定义的时候不要加任何修饰符：

```glsl
layout uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms;
```

在这个布局下，OpenGL会自己为 uniform 块的成员分配内存位置，这时候就不能自行指定成员内存位置了：

```glsl
# #version 460 core
uniform TransformBlock {
  layout (offset = 0) float scale;
  layout (offset = 102) vec3 translation;
  layout (offset = 116) float rotate[3];
  layout (offset = 135) mat4 projection_matrix;
} transforms;
# 
# void main() {
#   gl_Position =  transforms.projection_matrix * vec4(0.0);
# }
```
```txt 编译错误：
== 0:3(28): error: offset can only be used with std430 and std140 layouts
== 0:4(29): error: offset can only be used with std430 and std140 layouts
== 0:5(30): error: offset can only be used with std430 and std140 layouts
== 0:6(29): error: offset can only be used with std430 and std140 layouts
```

需要自己向 OpenGL 查询数据的位置和大小，因为OpenGL会按照自己的方式对数据的存放方式进行优化，此时程序员是无法预知数据的位置，只能向 OpenGL 查询数据到底存在哪。

查询某一成员在 uniform 块里的位置

```c
- 查询成员下标 glGetUniformIndices
```

```rust
# use gl::types::*;
# use sb7::application::Application;
# use sb7::utils::*;
# 
# #[derive(Default)]
# struct App {
#   program: GLuint,
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     let vs = "#version 460 core
#     uniform TransformBlock {
#       float scale;
#       vec3 translation;
#       float rotate[3];
#       mat4 projection_matrix;
#     } transforms;
# 
#     void main() {
#       gl_Position =  transforms.projection_matrix * vec4(0.0);
#     }";
# 
#     let fs = "#version 460 core
#     out vec4 color;
#     void main() {
#       color = vec4(1.0);
#     }";
# 
#     let program = program(&[shader(gl::VERTEX_SHADER, vs),
#                             shader(gl::FRAGMENT_SHADER, fs)]);
#     // 查询 uniform 成员的下标
    use std::ffi::CString;
    let uniform_names = [CString::new("TransformBlock.rotate"),
                         CString::new("TransformBlock.scale"),
                         CString::new("TransformBlock.translation"),
                         CString::new("TransformBlock.projection_matrix")];
    let uniform_names = uniform_names.iter()
                                     .map(|s| s.as_ref().unwrap().as_ptr())
                                     .collect::<Box<[_]>>();
    let mut uniform_indices = [0u32; 4];
    unsafe {
      gl::GetUniformIndices(program, 4,
                            uniform_names.as_ptr(),
                            uniform_indices.as_mut_ptr());
    }
    // [2, 0, 1, 3]
    println!("{:?}", uniform_indices);
#   }
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteProgram(self.program);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

知道 uniform 块成员的下标之后，就可以用这个下标查询成员的内存位置，占用大小等信息：

```c
- 查询对应的信息（成员内存起始位置，成员大小）glGetActiveUniformsiv
```

```rust
# use gl::types::*;
# use sb7::application::Application;
# use sb7::utils::*;
# 
# #[derive(Default)]
# struct App {
#   program: GLuint,
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     let vs = "#version 460 core
#     uniform TransformBlock {
#       float scale;
#       vec3 translation;
#       float rotate[3];
#       mat4 projection_matrix;
#     } transforms;
# 
#     void main() {
#       gl_Position =  transforms.projection_matrix * vec4(0.0);
#     }";
# 
#     let fs = "#version 460 core
#     out vec4 color;
#     void main() {
#       color = vec4(1.0);
#     }";
# 
#     let program = program(&[shader(gl::VERTEX_SHADER, vs),
#                             shader(gl::FRAGMENT_SHADER, fs)]);
#     // 查询 uniform 成员的下标
#     use std::ffi::CString;
#     let uniform_names = [CString::new("TransformBlock.rotate"),
#                          CString::new("TransformBlock.scale"),
#                          CString::new("TransformBlock.translation"),
#                          CString::new("TransformBlock.projection_matrix")];
#     let uniform_names = uniform_names.map(|s| s.unwrap().into_raw());
#     let mut uniform_indices = [0u32; 4];
#     unsafe {
#       gl::GetUniformIndices(program, 4, uniform_names.as_ptr() as _,
#                             uniform_indices.as_mut_ptr());
#       let _ = uniform_names.map(|s| CString::from_raw(s)); // 回收内存
#     }
# 
#     // 查询 uniform 成员的内存起始位置，每个元素的大小
    let mut uniform_offsets = [0; 4];
    let mut arr_strides = [0; 4];
    let mut mat_strides = [0; 4];
    unsafe {
      gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
                              gl::UNIFORM_OFFSET,
                              uniform_offsets.as_mut_ptr());
      gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
                              gl::UNIFORM_ARRAY_STRIDE,
                              arr_strides.as_mut_ptr());
      gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
                              gl::UNIFORM_MATRIX_STRIDE,
                              mat_strides.as_mut_ptr())
    }
#   }
#   fn shutdown(&self) {
#     unsafe {
#       gl::DeleteProgram(self.program);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

可以查看这些数组的数据：

```rust
println!("uniform_indices: {:?}", uniform_indices);
println!("     arr_stride: {:?}", arr_strides);
println!("     mat_stride: {:?}", mat_strides);

```
```txt 输出：
uniform_indices: [2, 0, 1, 3]    
     arr_stride: [4, 0, 0, 0]
     mat_stride: [0, 0, 0, 16]
```
进而得到各个成员的位置，以及每个元素的大小：

```rust
println!("rotate: offset = {}, stride = {}",
          uniform_offsets[0], arr_strides[0]);
println!("scale: offset = {}", uniform_offsets[1]);
println!("translation: offset = {}", uniform_offsets[2]);
println!("projection_matrix: offset = {}, stride = {}",
          uniform_offsets[3], mat_strides[3]);
```
```txt 输出：
scale: offset = 0
rotate: offset = 28, stride = 4
translation: offset = 16, stride = 0
projection_matrix: offset = 48, stride = 16
```

在查询到 uniform 块的内存布局之后，分配内存，写入数据：

```
TransformBlock.rotate: float[3]
TransformBlock.scale: float
TransformBlock.translation: vec3
TransformBlock.projection_matrix: mat4
```
最简单的情况，写入 float 变量：

```rust
let data = Box::new([0u8; 4096]);
let ptr =  data.as_ptr();

unsafe {
  let offset = uniform_offsets[1] as usize;
  *(ptr.add(offset) as *mut f32) = 3.0f32;
}
```

写入 vec3 变量：

```rust
unsafe {
  let offset = uniform_offsets[2] as usize;
  *(ptr.add(offset) as *mut f32).add(0) = 1.0f32;
  *(ptr.add(offset) as *mut f32).add(1) = 2.0f32;
  *(ptr.add(offset) as *mut f32).add(2) = 3.0f32;
}
```

写入数组：

```rust
let rotates: [f32; 3] = [30.0, 40.0, 50.0];
unsafe {
  let mut offset = uniform_offsets[0] as usize;
  for i in 0..3 {
    *(ptr.add(offset) as *mut f32) = rotates[i];
    offset += arr_strides[0] as usize;
  }
}
```

写入 mat4 变量：

```rust
// 以列为主的矩阵
let mat : [f32; 16]=  [ 1.0, 2.0, 3.0, 4.0,
                        9.0, 8.0, 7.0, 6.0,
                        2.0, 4.0, 6.0, 8.0,
                        1.0, 3.0, 5.0, 7.0 ];
for i in 0..4 {
  let mut offset = uniform_offsets[3] as usize
                 + mat_strides[3] as usize * i;
  for j in 0..4 {
    unsafe { *(ptr.add(offset) as *mut f32) = mat[i * 4 + j] };
    offset += std::mem::size_of::<f32>();
  }
}
```

向 OpenGL 查询 uniform 块的位置：

```c
- glGetUniformIndex???
```

给 uniform 块指定一个绑定下标

```c
- glUniformBlockBinding
```

将 buffer 绑定到刚才设置的绑定下标：

```c
- glBindBufferBase(GL_UNIFORM_BUFFER, index, buffer);
```

```rust
let [harry_index, bob_index, susan_index] = ["Harry", "Bob", "Susan"]
  .map(|s| CString::new(s).unwrap())
  .map(|s| gl::GetUniformBlockIndex(program, s.as_ptr()));

gl::UniformBlockBinding(program, harry_index, 1);
gl::BindBufferBase(gl::UNIFORM_BUFFER, 1, buf_c);

gl::UniformBlockBinding(program, bob_index, 3);
gl::BindBufferBase(gl::UNIFORM_BUFFER, 3, buf_a);

gl::UniformBlockBinding(program, susan_index, 0);
gl::BindBufferBase(gl::UNIFORM_BUFFER, buf_b, 0);
```

uniform 块的绑定下标还可以在 shader 里指定：

```glsl
layout (binding = 1) uniform Harry {
#   float a;
#   mat4 b;
};

uniform (binding = 3) Bob {
#   int c;
#   ivec4 d;
};

uniform (binding = 0) Susan {
#   mat4 e[10];
};
```

这样子就可以删除 `UniformBlockBinding()` 函数了：

```
  gl::BindBufferBase(gl::UNIFORM_BUFFER, 1, buf_c);

  gl::BindBufferBase(gl::UNIFORM_BUFFER, 3, buf_a);

  gl::BindBufferBase(gl::UNIFORM_BUFFER, buf_b, 0);
```

// todo 验证 std140 布局

## Shader 存储块

buffer 除了用来向 shader 传递以外，还可以通过 shader 存储块来存储来自 shader 的数据。

和 uniform 块的相似之处：
- 声明：和 uniform 块类似，只是将 uniform 关键字替换成 buffer
- 绑定buffer：也是用 `BindBufferBase` 函数，只是将 `GL_UNIFORM_BUFFER` 换成 `GL_SHADER_STORAGE_BUFFER`
- 可以指定内存布局：std140 std430

不同之处：
- shader 可以写入 uniform 块的内容
- shader 存储块内部的成员是原子操作(读取-编辑-写入 --> 一个操作)
- 在 OpenGL 程序里可以用 glBufferData 来向 shader 存储块写入数据
  也可以通过 glMapBufferRange 读取 uniform 存储块的数据

```glsl
#version 460 core

struct vertex {
  vec4 position;
  vec3 color;
};

layout (binding = 0, std430) buffer my_vertices {
  vertex vertices[];
};

uniform mat4 transform_matrix;

out VS_OUT {
  vec3 color;
} vs_out;

void main(void) {
  gl_Position = transform_matrix * vertices[gl_VertexID].position;
  vs_out.color = vertices[gl_VertexID].color;
}
```

在 shader 存储块内，只有 int 和 uint 变量才能进行原子操作。需要调用以下函数：

|Syntax                                   |Description                  |
|:----------------------------------------|:----------------------------|
|uint atomicAdd(inout uint mem, uint data)<br>int atomicAdd(inout int mem, int data) |从 mem 读数据，将其和 data 相加，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem + data|
|uint atomicMin(inout uint mem, uint data)<br>int atomicMin(inout int mem, int data) |从 mem 读数据，将其和 data 取最小值，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem.min(data) |
|uint atomicMax(inout uint mem, uint data)<br>int atomicMax(inout int mem, int data) |从 mem 读数据，将其和 data 取最大值，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem.max(data) |
|uint atomicAnd(inout uint mem, uint data)<br>int atomicAnd(inout int mem, int data) |从 mem 读数据，将其和 data 按位求逻辑与，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem & data |
|uint atomicOr(inout uint mem, uint data) <br>int atomicOr(inout int mem, int data)  |从 mem 读数据，将其和 data 按位求逻辑或，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem \| data|
|uint atomicXor(inout uint mem, uint data)<br>int atomicXor(inout int mem, int data) |从 mem 读数据，将其和 data 按位异或，结果存入 mem。返回值：mem 之前的值 <br> mem <- mem xor data  |
|uint atomicExchange(inout uint mem, uint data)<br>int atomicExchange(inout int mem, int data) | 从 mem 读数据，将 data 写入 mem。返回值：mem 之前的值 <br> mem <- data             |
|uint atomicCompSwap(inout uint mem, uint compare, uint data)<br>int atomicCompSwap(inout int mem, int compare, int data) | 从 mem 读数据，如果读到的数据和 comp 相等，将 data 写入 mem。返回值：mem 之前的值<br> if mem == comp {<br>&nbsp;&nbsp; mem <- data<br>}|

### 同步访问内存

在任何情况下，对内存的读操作都是安全的。但是，当 shader 开始将数据写入 buffer 时，无论是写入 shader 存储块里的变量，还是显式调用可能会写入内存的原子操作函数，在某些情况下需要避免内存风险。

内存风险大概分为三类：

- 先读后写(RAW)风险：当程序企图在写入一块内存后读取时，根据系统的体系结构，读和写可能被重新排序，使得读在写之前完成，导致旧数据返回应用程序
- 先写后写（WRW)风险：当程序连续两次写入同一块内存时，在某些体系结构下，无法保证第二个数据会覆盖第一个数据，导致最终进入内存的是第一个数据
- 先写后读风险（WAR）风险：只在并行处理系统里（如GPU）出现，当一个执行线程在另一个线程 __认为__ 自己读取后写入内存时，就可能发生。如果这些操作被重新排序，执行读操作的线程会读取到第二个线程写入的数据，而这是无法预料的。

由于OpenGL所期望运行的系统具有深度流水线和高度并行的特性，它包含了许多机制来减轻和控制内存风险。如果没有这些特性，OpenGL实现将需要更加保守地重新排序着色器并并行运行它们。处理内存风险的主要工具是*内存屏障（memory barrier）*。

内存屏障本质上是一个标记，它告诉OpenGL，“嘿，如果你要开始重新排序，那很好--只是不要让我在这一点之后说的任何话发生在我在这一点之前说的任何话之前。”你可以在应用程序代码中（通过调用OpenGL）和着色器中插入屏障。

其实本质上是一个标记点，只有在这个点之前的事件都完成后，OpenGL才可以执行这个点之后的事件。

#### 在 OpenGL 应用程序内使用屏障

```c
void glMemoryBarrier(GLbitfield barriers);
```

// TODO: barriers 参数 

#### 在 shader 内使用屏障

```glsl
void memoryBarrier();
```

更为具体的函数：`memoryBarrierBuffer()`

## 原子计数器

一种特殊类型的变量，表示跨多个着色器调用共享的存储。

- 这个存储由一个buffer对象支持，GLSL中提供了函数来递增和递减存储在缓冲区中的值。
  - 这些操作的特殊之处在于它们是原子的：就像着色器存储块成员的等效函数（如表5.5所示）一样，它们返回计数器修改前的原始值。
  - 就像其他原子操作一样，如果两个着色器调用同时递增同一个计数器，OpenGL会让它们轮流执行。不能保证这些操f作将发生的顺序，但能保证结果正确。

在 shader 内声明原子计数器：

```glsl
layout (binding = 0) uniform atomic_uint my_variable
```

binding 代表原子计数器和用来存储存储值的 buffer 之间的绑定点。

每个原子计数器存储在缓冲区对象中的特定偏移量处。这个偏移量可以在 shader 里通过 offset 限定符指定：

```glsl
layout (binding = 3, offset = 8) uniform atomic_uint my_variable;
```

存储原子计数器的 buffer 需要绑定到 `GL_ATOMIC_COUNTER_BUFFER` 上：

```rust
# use gl::types::*;
# use sb7::application::Application;
# use std::{mem::size_of, ptr::null};
# 
// 创建 buffer
let mut buf = 0;
gl::CreateBuffers(1, &mut buf);

// 绑定到 GL_ATOMIC_COUNTER_BUFFER，分配空间
gl::BindBuffer(gl::ATOMIC_COUNTER_BUFFER, buf);
gl::BufferData(gl::ATOMIC_COUNTER_BUFFER,
                16 * size_of::<GLuint>() as isize,
                null(), gl::DYNAMIC_COPY);

// 设置绑定下标，和 shader 内的原子计数器对应
gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 3, buf);
```

初始化存储原子计数器的 buffer：

```rust
# use gl::types::*;
# use sb7::application::Application;
# use std::{mem::size_of, ptr::null};
# let mut buf = 0;
# gl::CreateBuffers(1, &mut buf);
# gl::BindBuffer(gl::ATOMIC_COUNTER_BUFFER, buf);
# gl::NamedBufferData(buf,
#                     16 * size_of::<GLuint>() as isize,
#                     null(), gl::DYNAMIC_COPY);
# gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 3, buf);
# 
let zero: GLuint = 0;

// 方法1 - 使用 gl(Named)BufferSubData 命令
gl::NamedBufferSubData(buf,
                       2 * size_of::<GLuint>() as isize,
                       size_of::<GLuint>() as isize,
                       &zero as *const _ as _);

// 方法2 - 使用 glMap(Named)BufferRange 命令将 buffer 映射到
//        OpenGL 应用程序的内存空间上，然后直接写入
let data: *mut GLuint =
  gl::MapNamedBufferRange(buf,
                          0, 16 * size_of::<GLuint>() as isize,
                          gl::MAP_WRITE_BIT |
                          gl::MAP_INVALIDATE_RANGE_BIT) as _;
*data.add(2) = 0;

// 方法3 - 使用 glClear(Named)BufferSubData 命令
gl::ClearNamedBufferSubData(buf,
                            gl::R32UI,
                            2 * size_of::<GLuint>() as isize,
                            2 * size_of::<GLuint>() as isize,
                            gl::RED_INTEGER,
                            gl::UNSIGNED_INT,
                            &zero as *const u32 as _);
```

在初始化 buffer，并将和原子计数器绑定后，就可以在 shader 内使用原子计数器计数了。

递增计数器：

```glsl
uint atomicCounterIncrement(atomic_uint c);
```

这个函数从原子计数器读取值，将其加一，返回原来读到的值。

递减计数器：

```glsl
uint atomicCounterDecrement(atomic_uint c);
```

**这个函数返回减一后的值。**

查询原子计数器的值：

```glsl
uint atomicCounter(atomic_uint c);
```
在片段着色器内使用原子计数器来计算渲染对象在屏幕空间上的面积：

```glsl
#version 450 core
layout (binding = 0, offset = 0) uniform atomic_uint area;

void main(void) {
  atomicCounterIncrement(area);
}
```
shader 内没有输出（使用 out 修饰的变量），不会向帧缓冲写入任何数据。在运行这个 shader 时，可以关闭向帧缓冲的写入：

```c
glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
```
重新启用对缓冲区的写入：

```c
glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
```

原子计数器的值存储在 buffer 上，因此可以将原子计数器绑定到其他的 buffer 对象，比如 `GL_UNIFORM_BUFFER`，之后就可以通过 uniform 块来使用原子计数器的值了：

```glsl
#version 450 core

layout (binding = 0) uniform area_block {
  uint counter_value;
}

out vec4 color;

uniform float max_area;

void main(void) {
  float brightness = clamp(float(counter_value) / max_area,
                           0.0, 1.0);
  color = vec4(vec3(brightness), 1.0);
}
```
在 startup 函数里将存储原子计数器值的缓冲绑定到 GL_ATOMIC_COUNTER_BUFFER 与 GL_UNIFORM_BUFFER，这样子这块缓冲就可以同时用作原子计数器和一致区块了。

在 render 函数里，先使用原子计数器进行计数，再读取一致区块内的原子计数器的值，来渲染物体：

```rust
# use gl::*;
# use sb7::{application::*, vmath::*};
# use std::{
#   ffi::CString,
#   mem::{size_of, size_of_val},
#   ptr::{addr_of, null},
# };
# 
# #[derive(Default)]
# struct App {
#   prog_counter: u32,
#   prog_render: u32,
#   vao: u32,
#   vbo: u32,
#   atombuf: u32,
#   proj_mat: Mat4,
#   max_area: f32,
# }
# 
# impl Application for App {
#   fn init(&self) -> AppConfig {
#     AppConfig { width: 704,
#                 height: 315,
#                 ..Default::default() }
#   }
# 
  fn startup(&mut self) {
#     let vs_src = "
#       #version 460 core
#       
#       in vec3 position;
#       uniform mat4 trans;
# 
#       void main(void) {
#         gl_Position = trans * vec4(position, 1.0);
#       }";
# 
#     let vs_src = CString::new(vs_src).unwrap();
# 
#     let fs_counter_src = "
#       #version 460 core
# 
#       layout (binding = 0, offset = 0) uniform atomic_uint area;
#       out vec4 color;
#       
#       void main(void) {
#         atomicCounterIncrement(area);
#         color = vec4(1.0);
#       }";
# 
#     let fs_counter_src = CString::new(fs_counter_src).unwrap();
# 
#     let fs_render_src = "
#       #version 460 core
#       
#       layout (binding = 0) uniform area_block {
#       uint counter_value;
#       };
#       
#       out vec4 color;
#       
#       uniform float max_area;
#       
#       void main(void) {
#         float brightness = clamp(float(counter_value) / max_area,
#                                   0.0, 1.0);
#         color = vec4(vec3(brightness), 1.0);
#       }";
#     let fs_render_src = CString::new(fs_render_src).unwrap();
# 
#     // 设置 shader
#     unsafe {
#       let vs = CreateShader(VERTEX_SHADER);
#       ShaderSource(vs, 1, &vs_src.as_ptr(), null());
#       CompileShader(vs);
# 
#       let fs_counter = CreateShader(FRAGMENT_SHADER);
#       ShaderSource(fs_counter, 1, &fs_counter_src.as_ptr(), null());
#       CompileShader(fs_counter);
# 
#       let fs_render = CreateShader(FRAGMENT_SHADER);
#       ShaderSource(fs_render, 1, &fs_render_src.as_ptr(), null());
#       CompileShader(fs_render);
# 
#       self.prog_counter = CreateProgram();
#       AttachShader(self.prog_counter, vs);
#       AttachShader(self.prog_counter, fs_counter);
#       LinkProgram(self.prog_counter);
# 
#       self.prog_render = CreateProgram();
#       AttachShader(self.prog_render, vs);
#       AttachShader(self.prog_render, fs_render);
#       LinkProgram(self.prog_render);
# 
#       DeleteShader(vs);
#       DeleteShader(fs_counter);
#       DeleteShader(fs_render);
#     }
# 
#     // 设置 vao
#     #[rustfmt::skip]
#     let vertex_position : &[f32]= &[
#       -0.25,  0.25, -0.25,
#       -0.25, -0.25, -0.25,
#        0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25,  0.25, -0.25,
#       -0.25,  0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#        0.25, -0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
#        0.25,  0.25, -0.25,
# 
#        0.25, -0.25,  0.25,
#       -0.25, -0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25,  0.25,  0.25,
#        0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25, -0.25,
#       -0.25,  0.25, -0.25,
#       -0.25,  0.25,  0.25,
# 
#       -0.25, -0.25,  0.25,
#        0.25, -0.25,  0.25,
#        0.25, -0.25, -0.25,
# 
#        0.25, -0.25, -0.25,
#       -0.25, -0.25, -0.25,
#       -0.25, -0.25,  0.25,
# 
#       -0.25,  0.25, -0.25,
#        0.25,  0.25, -0.25,
#        0.25,  0.25,  0.25,
# 
#        0.25,  0.25,  0.25,
#       -0.25,  0.25,  0.25,
#       -0.25,  0.25, -0.25
#     ];
# 
#     unsafe {
#       let mut vao = 0;
#       CreateVertexArrays(1, &mut vao);
# 
#       let mut vbo = 0;
#       CreateBuffers(1, &mut vbo);
#       NamedBufferData(vbo,
#                       size_of_val(vertex_position) as _,
#                       vertex_position.as_ptr() as _,
#                       STATIC_DRAW);
# 
#       VertexArrayVertexBuffer(vao, 0, vbo, 0, 3 * size_of::<f32>() as i32);
#       VertexArrayAttribFormat(vao, 0, 3, FLOAT, FALSE, 0);
#       VertexArrayAttribBinding(vao, 0, 0);
#       EnableVertexArrayAttrib(vao, 0);
#       self.vao = vao;
#       self.vbo = vbo;
#     }
# 
#     // 设置存储 原子计数器 的 buffer
#     unsafe {
      let mut buf = 0;
      CreateBuffers(1, &mut buf);
      NamedBufferData(buf, size_of::<u32>() as _,
                      &0u32 as *const u32 as _, DYNAMIC_COPY);
# 
      self.atombuf = buf;
# 
      BindBuffer(UNIFORM_BUFFER, buf);
      BindBufferBase(UNIFORM_BUFFER, 0, buf);
      BindBuffer(ATOMIC_COUNTER_BUFFER, buf);
      BindBufferBase(ATOMIC_COUNTER_BUFFER, 0, buf);
#     }
# 
#     // 初始化投影矩阵
#     self.on_resize(704, 315);
# 
#     // 启用深度测试
#     unsafe {
#       Enable(DEPTH_TEST);
#     }
  }

  fn render(&self, current_time: f64) {
#     let Self { vao,
#                proj_mat,
#                prog_render,
#                prog_counter,
#                atombuf,
#                max_area,
#                .. } = self;
# 
#     unsafe {
#       ClearBufferfv(COLOR, 0, [0.0, 0.0, 0.0f32].as_ptr());
#       ClearBufferfv(DEPTH, 0, &1.0);
#     }
# 
#     unsafe {
#       BindVertexArray(*vao);
#     }
# 
#     let current_time = current_time as f32;
# 
#     for i in 0..24 {
#       let f = i as f32 + current_time * 0.3;
# 
#       let trans_mat = translate(0.0, 0.0, -6.0)
#                       * rotate_with_axis(current_time * 45.0, 0.0, 1.0, 0.0)
#                       * rotate_with_axis(current_time * 21.0, 1.0, 0.0, 0.0)
#                       * translate((2.1 * f).sin() * 2.0,
#                                   (1.7 * f).cos() * 2.0,
#                                   (1.3 * f).sin() * (1.5 * f).cos() * 2.0);
#       let trans_mat = *proj_mat * trans_mat;
# 
#       unsafe {
        ColorMask(FALSE, FALSE, FALSE, FALSE);
        DepthMask(FALSE);

        // 使用 prog_counter 计算面积
        UseProgram(*prog_counter);
# 
#         let cptr = CString::new("trans").unwrap();
#         let location = GetUniformLocation(*prog_counter, cptr.as_ptr());
#         UniformMatrix4fv(location, 1, FALSE, addr_of!(trans_mat) as _);
# 
        // 重置原子计数
        NamedBufferData(*atombuf,
                        size_of::<u32>() as _,
                        &0u32 as *const _ as _,
                        DYNAMIC_COPY);
# 
        DrawArrays(TRIANGLES, 0, 36);

        // 等待所有 shader 执行完毕
        MemoryBarrier(UNIFORM_BARRIER_BIT);

        ColorMask(TRUE, TRUE, TRUE, TRUE);
        DepthMask(TRUE);

        // 使用 prog_render 渲染
        UseProgram(*prog_render);
# 
#         let cstr = CString::new("trans").unwrap();
#         let location = GetUniformLocation(*prog_render, cstr.as_ptr());
#         UniformMatrix4fv(location, 1, FALSE, addr_of!(trans_mat) as _);
# 
#         let cstr = CString::new("max_area").unwrap();
#         let location = GetUniformLocation(*prog_render, cstr.as_ptr());
#         Uniform1f(location, *max_area);
# 
        DrawArrays(TRIANGLES, 0, 36);
#       }
#     }
  }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as f32 / h as f32;
#     self.proj_mat = sb7::vmath::perspective(45.0, aspect, 0.1, 1000.0);
#     self.max_area = (w * h) as f32 * 0.03;
#   }
# 
#   fn shutdown(&self) {
#     unsafe {
#       DeleteProgram(self.prog_counter);
#       DeleteProgram(self.prog_render);
#       DeleteVertexArrays(1, &self.vao);
#       DeleteBuffers(1, &self.vbo);
#       DeleteBuffers(1, &self.atombuf);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

WebGL 里并没有原子计数器，这里只是使用 gl_FragCoord.z 值模拟上面代码的结果，毕竟跑起来的效果差不多。物体里摄像机越近，在屏幕空间上占据的像素点就越多，亮度越亮：

{% raw %}
<div class="demo_app" id="_ch5_1_1_atom_counter"></div>
{% endraw %}

### 原子计数器的同步访问

- 原子计数器其实是缓冲区对象中的一个位置，当着色器执行时，他们的值可能驻留在GPU的特殊内存中，当着色器执行完毕时，原子计数器的值将被写回内存。
- 原子计数器的递增和递减被认为是内存操作的一种形式，可能会受到之前描述的内存风险影响。

`glMemoryBarrier` 可以将对原子计数器的访问与 OpenGL 管道的其他部分进行同步：

```c
glMemoryBarrier(GL_ATOMIC_COUNTER_BARRIER_BIT);
```

- 这个函数调用确保了OpenGL 应用程序对缓冲区对象内的原子计数器进行修改，那么着色器会使用更新后的值。
  - 在将数据写入缓冲区时，应该调用这个函数，同步着色器访问到的值。

glsl 内部类似的函数：

```glsl
memoryBarrierAtomicCounter();
```
这个函数会等待，直到对原子计数器的操作结束后才退出。

## 纹理

- 一种结构化的存储形式，着色器可以对其进行读写操作
- 常用于存储图像数据
- 最常见的纹理布局是二维的，但是纹理也可以在一维或三维布局、数组形式（多个纹理堆叠在一起形成一个逻辑对象）、立方体中创建

### 创建、初始化纹理

1. 创建纹理，设置纹理类型（glCreateTextures）
2. 设置存储的图像的大小，分配空间（glTexStorage2D

使用 glCreateTextures() 创建纹理对象，然后使用glTexStorage2D()函数为纹理分配存储空间，使用glBindTexture()将其绑定到GL_TEXTURE_2D目标：

```rust
use gl::*;
let mut texture = 0;

// 创建纹理
CreateTextures(TEXTURE_2D, 1, &mut texture);

// 为纹理分配空间
TextureStorage2D(texture,   // 要分配空间的纹理对象
                 1,         // 分级细化等级
                 RGBA32F,   // 纹理的数据格式
                 256, 256); // 纹理宽、高

// 绑定纹理目标
BindTexture(TEXTURE_2D, texture);
```
使用 glTexSubImage2D() 向纹理对象写入数据：

```rust
# use sb7::application::*;
# 
# #[derive(Default)]
# struct App;
# 
# impl App {
#   fn generate_texture(&self, data: &mut [f32], width: usize, height: usize) {
#     assert_eq!(data.len(), width * height * 4);
#     for y in 0..height {
#       for x in 0..width {
#         data[(y * width + x) * 4 + 0] = ((x & y) & 0xFF) as f32 / 255.0;
#         data[(y * width + x) * 4 + 1] = ((x | y) & 0xFF) as f32 / 255.0;
#         data[(y * width + x) * 4 + 2] = ((x ^ y) & 0xFF) as f32 / 255.0;
#         data[(y * width + x) * 4 + 3] = 1.0;
#       }
#     }
#   }
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      use gl::*;
#       let mut texture = 0;
# 
#       // 创建纹理
#       CreateTextures(TEXTURE_2D, 1, &mut texture);
# 
#       // 分配空间
#       TextureStorage2D(texture,   // 要分配空间的纹理对象
#                        1,         // 分级细化等级
#                        RGBA32F,   // 数据格式
#                        256, 256); // 纹理宽、高
# 
#       // 绑定纹理目标
#       BindTexture(TEXTURE_2D, texture);
# 
      // 在堆上分配空间，这段内存会在离开作用域时自动释放
      let mut data = Box::new([0f32; 256 * 256 * 4]);

      // generate_texture 函数用来向 data 填充数据
      self.generate_texture(&mut data[..], 256, 256);

      // 将生成的数据写入到纹理对象
      TextureSubImage2D(texture,
                        0,        // 细节等级，等级0代表基本图形级别
                        0, 0,     // 偏移量 0, 0
                        256, 256, // 宽 x 高
                        RGBA,     // 四通道数据
                        FLOAT,    // 数据类型为浮点数
                        data.as_ptr() as _)
#     }
#   }
# }
# 
# fn main() {
#   App::default().run();
# }
```
glClearTexSubImage() 函数也可以使用数据初始化纹理：

```c
void glClearTexSubImage(GLuint texture,
                        GLint level,
                        GLint xoffset,
                        GLint yoffset,
                        GLint zoffset,
                        GLsizei width,
                        GLsizei height,
                        GLsizei depth,
                        GLenum format,
                        GLenum type,
                        const void * data);
```
- 纹理的维度可以从传递的对象里推断出来
- level：分级细化级别
- xoffset、yoffset 和 zoffset：在纹理的起始偏移量
- width、height和depth：写入区域
- format和type：与glTexSubImage2D()完全相同
- data：被假定为单个texel值的数据，然后在整个纹理中复制这些数据

texel：纹素（英語：Texel，即texture element或texture pixel的合成字）是纹理元素的简称，它是计算机图形纹理空间中的基本单元。如同图像是由像素排列而成，纹理是由纹素排列表示的。 

### 纹理目标和类型

| 纹理目标（GL_TEXTURE_*） |  描述             |
|:-----------------------|:----------------|
| 1D                     |  一维纹理         |
| 2D                     |  二维纹理         |
| 3D                     |  三维纹理         |
| RECTANGLE              |  矩形纹理         |
| 1D_ARRAY               |  一维数组纹理      |
| 2D_ARRAY               |  二维数组纹理      |
| CUBE_MAP               |  立方体贴图纹理     |
| CUBE_MAP_ARRAY         |  立方体贴图数组纹理  |
| BUFFER                 |  缓冲区纹理        |
| 2D_MULTISAMPLE         |  二维多重采样纹理   |
| 2D_MULTISAMPLE_ARRAY   |  二维数组多重采样纹理|

- GL_TEXTURE_2D：最常使用的纹理，标准二维图像，代表一张图片
- GL_TEXTURE_1D、GL_TEXTURE_3D：一维和三维纹理
  - GL_TEXTURE_1D 可以看成高度为 1 的二维纹理
  - GL_TEXTURE_3D 可以用来表示**体积**，内部使用三维纹理坐标
- GL_TEXTURE_RECTANGLE：是二维纹理的特例，它们在着色器中的读取方式和它们支持的参数方面有细微的差异。
- GL_TEXTURE_1D_ARRAY、GL_TEXTURE_2D_ARRAY：表示聚集到单个对象中的纹理图像数组
- GL_TEXTURE_CUBE_MAP：立方体贴图纹理，形成一个立方体的六个正方形图像的集合，可以用来模拟光照环境
- GL_TEXTURE_CUBE_MAP_ARRAY：和 GL_TEXTURE_1D_ARRAY、GL_TEXTURE_2D_ARRAY 类似，表示一个立方体贴图数组的纹理
- GL_TEXTURE_BUFFER：缓冲区纹理、一种特殊类型的纹理，类似于一维纹理，只不过其存储是由缓冲区对象表示的。最大尺寸可以比一维纹理大得多。
- GL_TEXTURE_2D_MULTISAMPLE、GL_TEXTURE_2D_MULTISAMPLE_ARRAY：用于多重采样抗锯齿（MSAA），提高图像质量

### 在着色器里读取纹理数据

- 在创建并向纹理写入数据后，可以在着色器读取纹理数据来为片段着色
- 着色器中代表纹理的数据类型为采样器，不同的纹理类型对应不同的采样器类型
  - 二维纹理的采样器类型：Sampler2D

在声明采样器变量后，通过 texture() 函数读取纹理坐标下的数据：

```glsl
#version 460 core

uniform sampler2D s;
out vec4 color;

void main(void) {
  color = texture(s, gl_FragCoord.xy / textureSize(s, 0));
}
```
{% raw %}
<div class="demo_app" id="_ch5_4_simpletexture"></div>
{% endraw %}

#### 采样器类型

每种纹理对应的采样器：

| 纹理目标                          | 采样器类型         |
|:--------------------------------|:-----------------|
| GL_TEXTURE_1D                   | sampler1D        |
| GL_TEXTURE_2D                   | sampler2D        |
| GL_TEXTURE_3D                   | sampler3D        |
| GL_TEXTURE_RECTANGLE            | sampler2DRect    |
| GL_TEXTURE_1D_ARRAY             | sampler1DArray   |
| GL_TEXTURE_2D_ARRAY             | sampler2DArray   |
| GL_TEXTURE_CUBE_MAP             | samplerCube      |
| GL_TEXTURE_CUBE_MAP_ARRAY       | samplerCubeArray |
| GL_TEXTURE_BUFFER               | samplerBuffer    |
| GL_TEXTURE_2D_MULTISAMPLE       | sampler2DMS      |
| GL_TEXTURE_2D_MULTISAMPLE_ARRAY | sampler2DMSArray |

纹理存储的数据类型与采样器的关系：

- 存储浮点数据的纹理：sampler1D,...
- 存储有符号整数的纹理：添加前缀i，isampler1D, ...
- 存储无符号整数的纹理：添加前缀u，usampler1D, ...

内置函数 texelFetch() 读取着色器中的纹理：

```glsl
vec4 texelFetch(sampler1D s, int P, int lod);
vec4 texelFetch(sampler2D s, ivec2 P, int lod);
ivec4 texelFetch(isampler2D s, ivec2 P, int lod);
uvec4 texelFetch(usampler3D s, ivec3 P, int lod);
```
- s：纹理的采样器变量
- P：纹理坐标
- lod：分级细化等级

虽然纹理对象的数据格式不同，这些函数都返回四维向量。如果纹理通道小于 4 (RGBA)，则绿色通道和蓝色通道的默认值为0，而alpha通道的默认值为1

内置函数 textureSize() 用来查询纹理尺寸：

```glsl
int textureSize(sampler1D sampler, int lod);
ivec2 textureSize(sampler2D sampler, int lod);
ivec3 textureSize(gsampler3D sampler, int lod);
```

查询多重采样纹理的采样数：

```glsl
int textureSamples(sampler2DMS sampler);
```

### 从文件载入纹理

- ktx（Khronos纹理格式）：专门为存储 OpenGL 纹理的东西而设计的。
- .ktx文件包含了大多数需要传递给 OpenGL 的参数，以便直接从文件加载纹理。

载入：

```rust
let tex = sb7::ktx::file::load("media/textures/tree.ktx").unwrap().0;
```
#### 纹理坐标

在本章前面的简单示例中，我们使用当前片段的窗口空间坐标作为从纹理读取的位置。

- 可以使用任何你想要的任何值
- 纹理坐标一般会作为顶点属性传入顶点着色器，然后输出到片段着色器：

```glsl
#version 450 core
uniform mat4 mv_matrix;
uniform mat4 proj_matrix;
layout (location = 0) in vec4 position;
layout (location = 4) in vec2 tc;
out VS_OUT
{
  vec2 tc;
} vs_out;
void main(void)
{
  // Calculate the position of each vertex
  vec4 pos_vs = mv_matrix * position;
  // Pass the texture coordinate through unmodified
  vs_out.tc = tc;
  gl_Position = proj_matrix * pos_vs;
}
```
```glsl
#version 450 core
layout (binding = 0) uniform sampler2D tex_object;
// Input from vertex shader
in VS_OUT
{
  vec2 tc;
} fs_in;
// Output to framebuffer
out vec4 color;
void main(void)
{
  // Simply read from the texture at the (scaled) coordinates and
  // assign the result to the shader's output.
  color = texture(tex_object, fs_in.tc * vec2(3.0, 1.0));
}
```

通过向每个顶点传递纹理坐标，我们可以将纹理环绕在物体周围。

纹理坐标由艺术家使用建模程序手工分配，并存储在目标文件中。如果我们将一个简单的棋盘格图案加载到一个纹理中，并将其应用到一个对象上，我们可以看到纹理是如何缠绕在它周围的:

{% raw %}
<div class="demo_app" id="_ch5_5_simpletexcoords"></div>
{% endraw %}


### 控制纹理数据的读取方式

OpenGL在如何从纹理中读取数据并将其返回给着色器方面提供了很大的灵活性。通常，纹理坐标是规范化的--也就是说，它们的范围在0.0和1.0之间。OpenGL允许您控制当您提供的纹理坐标超出此范围时会发生什么。这被称为采样器的包装模式。另外，你可以决定如何计算真实样本之间的值。这被称为采样器的过滤模式。控制采样器的包装和过滤模式的参数存储在采样器对象中：

创建采样器对象：

```c
void glCreateSamplers(GLsizei n, GLuint * samplers);
```
设置采样器参数：

```c
void glSamplerParameteri(GLuint sampler,
                         GLenum pname,
                         GLint param);
void glSamplerParameterf(GLuint sampler,
                         GLenum pname,
                         GLfloat param);
```

您将需要绑定一个采样器对象才能使用它，但在这种情况下，您将它绑定到一个纹理单元，就像您将纹理绑定到一个纹理单元一样。用于将采样器对象绑定到纹理单元之一的函数是glBindSampler()，其原型是:

```c
void glBindSampler(GLuint unit, GLuint sampler);
```

```rust
use gl::*;
# use sb7::application::*;
# use std::{ffi::CString, ptr::addr_of};
# 
# #[derive(Default)]
# struct Uniforms {
#   mv_matrix:   i32,
#   proj_matrix: i32,
# }
# 
# #[derive(Default)]
struct App {
#   tex_object:     [u32; 2],
#   tex_index:      usize,
#   render_prog:    u32,
#   uniforms:       Uniforms,
#   object:         sb7::object::Object,
  sampler_object: u32,
}
# 
# impl Application for App {
#   fn init(&self) -> AppConfig {
#     AppConfig { title: "OpenGL SuperBible - Texture Coordinates".into(),
#                 ..Default::default() }
#   }
# 
#   fn startup(&mut self) {
#     macro_rules! tex_data {
#       (@a W) => ([ 0xFF, 0xFF, 0xFF, 0xFFu8 ]);
#       (@a B) => ([ 0x00, 0x00, 0x00, 0x00u8 ]);
#       ($($x: ident),+ $(,)?) => ([$(tex_data!(@a $x),)*].concat());
#     }
# 
#     let tex_data = tex_data! {
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#       B, W, B, W, B, W, B, W, B, W, B, W, B, W, B, W,
#       W, B, W, B, W, B, W, B, W, B, W, B, W, B, W, B,
#     };
# 
#     unsafe {
#       GenTextures(1, &mut self.tex_object[0]);
#       BindTexture(TEXTURE_2D, self.tex_object[0]);
#       TexStorage2D(TEXTURE_2D, 1, RGB8, 16, 16);
#       TexSubImage2D(TEXTURE_2D, 0, 0, 0, 16, 16,
#                     RGBA, UNSIGNED_BYTE,
#                     tex_data[..].as_ptr() as _);
# 
      GenSamplers(1, &mut self.sampler_object);
      SamplerParameteri(self.sampler_object,TEXTURE_MIN_FILTER,
                        NEAREST as _);
      SamplerParameteri(self.sampler_object, TEXTURE_MAG_FILTER,
                        NEAREST as _);
#     }
# 
#     self.tex_object[1] = 
#       sb7::ktx::file::load("media/textures/pattern1.ktx").unwrap().0;
# 
#     self.object.load("media/objects/torus_nrms_tc.sbm");
# 
#     self.load_shaders();
# 
#     unsafe {
#       Enable(DEPTH_TEST);
#       DepthFunc(LEQUAL);
#     }
# 
#     let AppConfig { width, height, .. } = AppConfig::default();
#     self.on_resize(width as _, height as _);
#   }
# 
#   fn render(&self, current_time: f64) {
#     let grey = [0.2, 0.2, 0.2, 1.0f32].as_ptr();
#     let ones = [1.0f32].as_ptr();
# 
#     unsafe {
#       ClearBufferfv(COLOR, 0, grey);
#       ClearBufferfv(DEPTH, 0, ones);
# 
#       BindTexture(TEXTURE_2D, self.tex_object[self.tex_index]);
      BindSampler(0, self.sampler_object);
# 
#       let mv_proj =
#         sb7::vmath::translate(0.0, 0.0, -3.0)
#         * sb7::vmath::rotate_with_axis(current_time as f32 * 19.3,
#                                        0.0, 1.0, 0.0)
#         * sb7::vmath::rotate_with_axis(current_time as f32 * 21.1,
#                                        0.0, 0.0, 1.0);
# 
#       UniformMatrix4fv(self.uniforms.mv_matrix, 1, FALSE,
#                        addr_of!(mv_proj) as _);
# 
#       self.object.render();
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let proj_matrix = sb7::vmath::perspective(60.0,
#                                               w as f32 / h as f32,
#                                               0.1, 1000.0);
#     unsafe {
#       UniformMatrix4fv(self.uniforms.proj_matrix,
#                        1, FALSE, addr_of!(proj_matrix) as _);
#     }
#   }
# 
#   fn shutdown(&mut self) {
#     unsafe {
#       DeleteTextures(2, self.tex_object.as_ptr());
#       DeleteProgram(self.render_prog);
#       DeleteSamplers(1, &self.sampler_object);
#       self.object.free();
#     }
#   }
# 
#   fn on_key(&mut self, key: glfw::Key, press: glfw::Action) {
#     if let glfw::Action::Press = press {
#       match key {
#         glfw::Key::R => self.load_shaders(),
#         glfw::Key::T => {
#           self.tex_index += 1;
#           if self.tex_index > 1 {
#             self.tex_index = 0;
#           }
#         }
#         _ => {}
#       }
#     }
#   }
# }
# 
# fn main() {
#   App::default().run();
# }
# 
# impl App {
#   fn load_shaders(&mut self) {
#     if self.render_prog != 0 {
#       unsafe { DeleteProgram(self.render_prog) };
#     }
# 
#     self.render_prog = sb7::program::link_from_shaders(&[
#       sb7::shader::load("media/shaders/simpletexcoords/render.vs.glsl", 
#                         VERTEX_SHADER, true),
#       sb7::shader::load("media/shaders/simpletexcoords/render.fs.glsl", 
#                         FRAGMENT_SHADER, true)
#     ], true);
# 
#     let location = |name: &str| unsafe {
#       let name = CString::new(name).unwrap();
#       GetUniformLocation(self.render_prog, name.as_ptr())
#     };
# 
#     self.uniforms.mv_matrix = location("mv_matrix");
#     self.uniforms.proj_matrix = location("proj_matrix");
# 
#     unsafe {
#       UseProgram(self.render_prog);
#     }
#   }
# }
```

glBindSampler（）不是使用纹理目标，而是使用它应该绑定sampler对象的纹理单元的索引。sampler对象和绑定到给定纹理单元的纹理对象一起形成了一组完整的数据和参数，这些数据和参数是根据着色器的要求构造纹理所需的。通过从纹理数据中分离纹理采样器的参数，三个重要的行为成为可能:

- 您可以对大量纹理使用相同的采样参数集，而不必为每个纹理指定这些参数
- 您可以更改绑定到纹理单元的纹理，而无需更新采样器参数。
- 您可以同时使用多组采样器参数从同一纹理中读取

尽管非平凡的应用程序可能会选择使用它们自己的采样器对象，但每个纹理都有效地包含一个嵌入的采样器对象，当没有采样器对象绑定到相应的纹理单元时，该采样器对象包括用于该纹理的采样参数。您可以将其视为纹理的默认采样参数。若要访问存储在纹理对象内的采样器对象，请调用：

```c
void glTextureParameterf(GLuint texture,
                         GLenum pname,
                         GLfloat param);
void glTextureParameteri(GLuint texture,
                         GLenum pname,
                         GLint param);
```
如果你想在一个着色器中使用多个纹理，你需要创建多个采样器制服，并将它们设置为引用不同的纹理单元。您还需要同时将多个纹理绑定到上下文中。为了实现这一点，OpenGL支持多个纹理单元。可以通过使用GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS参数调用glGetIntegerv（）来查询所支持的单元数，如:

```c
GLint units;
glGetIntegerv(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS, &units);
```

这将告诉你最大数量的纹理单位，可以访问所有着色器阶段在任何一个时间。要将纹理绑定到特定的纹理单元，您需要调用glBindTextureUnit()，而不是像您到目前为止所做的那样调用glBindTextureUnit，它的原型是

```c
void glBindTextureUnit(GLuint unit,
                       GLuint texture)
```

这里，unit是要绑定纹理的单元的从零开始的索引，texture是要绑定的纹理对象的名称。例如，我们可以通过执行以下操作绑定多个纹理：

```c
GLuint textures[3];

// Create three 2D textures
glCreateTextures(3, GL_TEXTURE_2D, &textures);

// Bind the three textures to the first three texture units
glBindTextureUnit(0, textures[0]);
glBindTextureUnit(1, textures[1]);
glBindTextureUnit(2, textures[2]);
```

一旦你把多个纹理绑定到你的上下文中，你需要让你的着色器中的采样器制服参考不同的单位。采样器（表示一个纹理和一组采样参数）由着色器中的统一变量表示。如果您不初始化它们，它们将在默认情况下引用单元0。对于使用单个纹理的简单应用程序来说，这可能很好（您会注意到，到目前为止，我们在示例中已经满足了默认情况），但在更复杂的应用程序中，制服需要初始化以引用正确的纹理单元。为此，可以在着色器编译时使用着色器代码中的绑定布局限定符初始化其值。要创建三个采样器制服，涉及纹理单元0、1和2，我们可以编写:

```glsl
layout (binding = 0) uniform sampler2D foo;
layout (binding = 1) uniform sampler2D bar;
layout (binding = 2) uniform sampler2D baz;
```

#### 纹理过滤

纹理被缩放时使用的缩放方法，参数：GL_TEXTURE_MIN_FILTER / GL_TEXTURE_MAG_FILTER：

- GL_NEAREST：邻近缩放？
- GL_LINEAR：平滑缩放

{% raw %}
<div class="demo_app" id="_ch5_6_texturefilter"></div>
{% endraw %}

#### 分级细化纹理

{% raw %}
<div class="demo_app" id="_ch5_7_0_tunnel_scintillation"></div>
{% endraw %}

#### 分级细化纹理过滤

#### 分级细化纹理生成

#### 分级细化纹理应用

{% raw %}
<div class="demo_app" id="_ch5_7_tunnel"></div>
{% endraw %}

#### 环绕方式

{% raw %}
<div class="demo_app" id="_ch5_8_wrapmodes"></div>
{% endraw %}

{% raw %}
<div class="demo_app" id="_ch5_9_mirrorclampedge"></div>
{% endraw %}

### 数组纹理

{% raw %}
<div class="demo_app" id="_ch5_10_alienrain"></div>
{% endraw %}

### 在着色器中向纹理写入数据

### 同步存储图像

### 纹理压缩

### 纹理视图

{% raw %}
<script type="module" src="/js/openglsb7th/ch5/index.js">
</script>
{% endraw %}