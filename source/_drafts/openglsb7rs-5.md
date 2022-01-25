---
title: OpenGL超级宝典第七版学习笔记 (5)：数据
tags: OpenGL
categories: 学习笔记
date: 2022-01-23 13:35:55
---



- 如何创建 缓冲区对象（buffer） 和 纹理（texture），用来存储数据
- 如何让 OpenGL 自动填充顶点属性
- 如何从 shader 访问 buffer 和 texture 的数据

显卡可以吞吐大量数据，每次向 OpenGL 传输少量数据会浪费性能。OpenGL 主要通过两种方式来存储、访问数据：Buferr 和 纹理：

- buffer 将数据线性存储在一个内存块中，作为通用的容器
- texture 用来存储多维的数据结构（比如图像）

## Buffer

- buffer：内存中分配的一块区域，线性存储数据
- buffer 可以里的数据可以传递给 shader，也可以用来存储 shader 产生的数据

### 创建 Buffer

最常用的函数：`glCreateBuffers()`，用来同时创建 buffer 对象：

```c
void glCreateBuffers(GLsizei n, GLuint *buffers);
```

- 第一个参数 `n` 为要创建 buffer 对象的个数，也就是说这个函数可以一次性创建多个 buffer
- 第二个参数是一个 `GLuint` 类型的指针，可以看成 `glCreateBuffers` 的返回值了
  代表这些创建的 buffer 对象

常见的使用方式：

```c
GLuint buf;
glCreateBuffers(1, &buf);
```

这样子就创建了一个 buffer，以后就可以通过 buf 这个变量来使用。

如果要一次性创建多个 buffer，第二个参数可以传一个数组进去：

```c
GLuint bufs[3];
glCreateBuffers(3, buf);
```

这里不难发现，OpenGL 在创建一个对象后，会给我们分配一个 GLuint 变量，通过这个 GLuint 变量来操控
OpenGL 对象。在 OpenGL 的文档里，这个 GLuint 变量被称为对象的 _name_ 属性。

### 绑定 buffer 对象

创建 buffer 对象之后，可以通过调用 `glBindBuffer()` 函数，来确定 buffer 对象的类型，用来说明以后这个 buffer 被用来来干什么，函数原型如下：

```c
void glBindBuffer(GLenum target, GLuint buffer);
```

在 OpenGL 里使用一个 buffer 之前，就必须调用`glBindBuffer()`函数，来将 buffer 添加到 opengl 的上下文中。

比如说要将 buffer 对象里的数据绑定为顶点属性：

```c
GLuint buf;
glCreateBuffer(1, &buf);
glBindBuffer(GL_ARRAY_BUFFER, buf);
```

上面传入的 `GL_ARRAY_BUFFER` 被称为 buffer 对象的**绑定目标**，也可以称为**绑定点**。

到这里只是创建和绑定了一个 buffer 对象，并没有给 buffer 分配空间:

```c
GLuint buf;
GLint size = -1;

glCreateBuffers(1, &buf);
glGetNamedBufferParameteriv(buf, GL_BUFFER_SIZE, &size);

printf("size: %d bytes", size); // size: 0 bytes
```

### 分配内存空间

分配空间的操作主要是通过调用这两个函数：

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

这两个函数功能一致，都是给 buffer 分配内存空间。如果之前 buffer 对象已经绑定了，就可以通过第一个函数的 target 参数来分配空间。

- `size`：分配多少内存，以字节为单位
- `data`：用来初始化（复制到） buffer 的数据，可以传递 null，这样就不会复制任何数据，如果要传入 data 对 buffer 进行初始化，data 的大小必须大于等于 size 字节。
- `flags`：只起到给 OpenGL 提供信息的作用，说明 buffer 在存储时有那些要求。和其他的 OpenGL 命令有关


buffer 对象在分配内存后，内存空间的 `size` 和 `flag` 属性是不可变的。如果要改变一个 buffer 对象的大小，就只能先将销毁内存空间，再调用上面两个函数重新分配。

比如要给 buffer 分配 1MB 的空间，并将字符串 "hello world" 初始化 buffer 的内存空间:

```rust
# use std::ffi::c_void;
# use sb7::application::Application;
# struct App;
# 
# unsafe fn buf_test() {
  let mut buf = 0;
  let mut data = Vec::from("hello world");
  data.resize(1024 * 1024, 0);
  gl::CreateBuffers(1, &mut buf);
  let data = data.as_ptr() as *const c_void;
  gl::NamedBufferStorage(buf, 1024 * 1024, data, gl::DYNAMIC_STORAGE_BIT);
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

下面的函数需要在给 buffer 分配空间后调用：

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
<canvas id="uniform_mat"></canvas>
<script src="/js/openglsb7th/ch5/uniform_mat.js"></script>
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
<canvas id="spinningcube"></canvas>
<script src="/js/openglsb7th/ch5/spinningcube.js"></script>
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
<canvas id="spinningcubes"></canvas>
<script src="/js/openglsb7th/ch5/spinningcubes.js"></script>
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
  - 数组：数组存储位置的起始位置遵循以上规则，但是之后会向上取整到 4 * N 字节
  

- 共享布局

需要自己向 OpenGL 查询数据的位置和大小，因为OpenGL会按照自己的方式对数据的存放方式进行优化，无法预知数据的位置（为了性能）

// 查询 uniform 块的信息

- 查询成员下标 glGetUniformIndices
- 查询对应的信息（成员内存起始位置，成员大小）glGetActiveUniformsiv

// 向 uniform 块写入数据

写入数据
