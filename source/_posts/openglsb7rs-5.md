---
title: OpenGL超级宝典第七版学习笔记 (5)：数据
tags: OpenGL
categories: 学习笔记
date: 2022-01-23 13:35:55
---


这是自己阅读 OpenGL 超级宝典（第七版）的笔记，使用 Rust 学习书上的示例。
- 随书源码：https://github.com/openglsuperbible/sb7code
- demo： https://github.com/yilozt/sb7coders

这一章主要介绍了 OpenGL 中两种重要的数据形式：缓冲（Buffer）和纹理（Texture）：

- 缓冲：OpenGL 里最常用的、用来存储数据的容器，可以类比成 C 里使用 malloc() 分配的一块空间，常用来存储模型的顶点数据。里面的数据线性存储，类似于一维数组。
- 纹理：用来存储多维的数据结构。如最常见的 2D 纹理，用来当作模型的贴图。

## 缓冲

一般用来存储顶点数据，然后作为顶点着色器的输入。也可以作为一般容器，用来在 OpenGL 程序和着色器之间传递数据。

### 创建缓冲区对象 / 分配空间

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

创建缓冲区对象之后，可以通过 `glBindBuffer()` 将对象绑定到当前 OpenGL 环境中：

```c
void glBindBuffer(GLenum target, GLuint buffer);
```
- `target` 称为绑定点（靶点）
  - 最常用的 target 应该就是 `GL_ARRAY_BUFFER` 了，用来将缓冲区作为顶点着色器的输入
- `buffer` 类型是 GLuint， 即之前 `glCreate...() / glGen...()` 返回的 GLuint 变量（创建的对象）

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

给缓冲区分配 100MB 的内存空间:

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
调用 `glNamedBufferStorage()` 之前用 `nvidia-smi` 命令查询显存：

```
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      3035      G   target/debug/test                   2MiB |
+-----------------------------------------------------------------------------+
```
调用 `glNamedBufferStorage()` 之后用 `nvidia-smi` 命令查询显存：

```
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      3035      G   target/debug/test                 102MiB |
+-----------------------------------------------------------------------------+
```

显存占用从 2M 增加到了 102M，说明缓冲区对象的存储空间其实是分配内显存里的。

如果要使用 `glBufferStorage()` 的话就需要将缓冲区绑定到靶点上：

```rust
use std::ptr::null;
let mut buf = 0;

// 100MB = 100 * 1024 * 1024 Btye
let size = 100 * 1024 * 1024;

gl::CreateBuffers(1, &mut buf);
gl::BindBuffer(gl::ARRAY_BUFFER, buf)
gl::BufferStorage(gl::ARRAY_BUFFER, buf, size as _, null(),
                  gl::DYNAMIC_STORAGE_BIT);
```
这两种方法功能一致。

`gl[Named]BufferStorage()` 的 `flag` 参数可能的取值：

| 标志                              | 说明                                               |
|:---------------------------------|:----------------------------------------------------|
| GL_DYNAMIC_STORAGE_BIT           | 可以直接更新缓冲区的数据                                |
| GL_MAP_READ_BIT                  | 缓冲区映射时，可以通过指针读取缓冲                        |
| GL_MAP_WRITE_BIT                 | 缓冲区映射时，可以通过指针写入缓存                        |
| GL_MAP_PERSISTENT_BIT            | 在绘制内容时保持缓冲区映射（持久映射）                     |
| GL_MAP_COHERENT_BIT              | 缓冲区映射图是连贯的                                   |
| GL_CLIENT_STORAGE_BIT            | 优先将缓冲区的存储空间分配到应用内存上，而不是在显存上分配    |

OpenGL 在执行绘制命令（`glDraw...()`）时会结果缓冲区映射，设置 `GL_MAP_PERSISTENT_BIT` 则可以一直保持映射状态，会牺牲一定性能。

GL_MAP_CORCORMENT_BIT 表示缓存区在 CPU 和 GPU 之间映射是密切相关的，保证了在 CPU 或 GPU 对缓冲区的写入效果最终会对另一方可见，而不需要应用程序进一步干预。如果不设置这个标志位，只有在结束缓冲区映射或者调用 `glFlushMappedBufferRange() / glMemoryBarrier()` 来应用更改。


### 更新缓冲区的内容

`gl[Named]BufferSubData()` 用来将数据写入缓冲区（内存 -> 显存）
需要将 `GL_DYNAMIC_STORAGE_BIT` 写入 `gl[Named]BufferStorage()` 的 flag 参数里：

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
- `offset` 表示要写入的起始位置，以字节为单位
- `size` 表示要写入多大的数据，以字节为单位

向缓冲区写入一组三角形的顶点数据：

```rust
# use sb7::application::Application;
# use std::mem::size_of_val;
# use std::ptr::null;
# struct App;
# 
# unsafe fn buf_test() {
#   // 创建 buffer
  let mut buf = 0;
  gl::CreateBuffers(1, &mut buf);
  gl::BindBuffer(gl::ARRAY_BUFFER, buf);
# 
#   // 分配 1 KB 空间
#   // 毕竟要更新 buffer 的内容，传入 DYNAMIC_STORAGE_BIT
#   gl::BufferStorage(gl::ARRAY_BUFFER, 1024, null(), gl::DYNAMIC_STORAGE_BIT);
# 
#   // 三角形的顶点数据
  let data = [
     0.25, -0.25, 0.5, 1.0,
    -0.25, -0.25, 0.5, 1.0,
     0.25,  0.25, 0.5, 1.0
  ];

  // 将顶点数据传入 buffer
  gl::BufferSubData(gl::ARRAY_BUFFER, 0,
                    size_of_val(&data) as _,
                    data.as_ptr() as _);
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
也可以通过**缓冲区映射**，将存储在显卡的缓冲区映射到 OpenGL 应用程序的内存上，这样就可以通过指针直接写入缓冲区：

```rust
# use sb7::application::Application;
# use std::ptr::null;
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);
      gl::NamedBufferStorage(buf, 1024 * 1024, null(), gl::MAP_READ_BIT);
      
      let data = [ 0.25, -0.25, 0.5, 1.0,
                  -0.25, -0.25, 0.5, 1.0,
                   0.25,  0.25, 0.5, 1.0, ];

      let ptr = gl::MapNamedBuffer(buf, gl::WRITE_ONLY);
# 
#       // 缓冲区映射失败时返回 null
#       assert_ne!(ptr as usize, 0, "buf map to null");

      std::ptr::copy(data.as_ptr(), ptr as *mut f64, data.len());
      gl::UnmapNamedBuffer(buf);
#     }
#   }
# }
# 
# fn main() {
#   App.run();
# }
```
对应的原型如下，`gl[Named]MapBuffer()` 用来将缓冲区映射到内存上，`gl[Named]UnmapBuffer()` 用来结束缓冲区映射：


```c
void *glMapBuffer(GLenum target,
                  GLenum access);
void *glMapNamedBuffer(GLuint buffer,
	                     GLenum access);

GLboolean glUnmapBuffer(GLenum target);
GLboolean glUnmapNamedBuffer(GLuint buffer);
```

`access` 有三种取值：`GL_READ_ONLY`，`GL_WRITE_ONLY`，`GL_READ_WRITE`
对应 `gl[Named]BufferStorage()` 的 flag 参数：`GL_MAP_READ_BIT`， `GL_MAP_WRITE_BIT`

将 Hello World 写入缓冲区，然后再读取到内存：

```rust
# use sb7::application::Application;
# use std::mem::size_of_val as sizeof;
# use std::ptr::null;
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       gl::NamedBufferStorage(buf,
#                              1024 * 1024,
#                              null(),
#                              gl::MAP_READ_BIT | gl::DYNAMIC_STORAGE_BIT);
      {
        let mut str = Vec::from("Hello World");
        str.resize(100, 0);
        gl::NamedBufferSubData(buf, 0, sizeof(&str[..]) as _,
                               str.as_ptr() as _);
      }

      let str = {
        let mut str = [0u8; 100];
        let ptr = gl::MapNamedBuffer(buf, gl::READ_ONLY);
        assert_ne!(ptr as usize, 0, "buf map to null");
# 
        std::ptr::copy(ptr as _, str.as_mut_ptr(), 100);
#         
        gl::UnmapNamedBuffer(buf);
        str
      };

      // [Hello World]
      println!("[{}]",
               std::str::from_utf8(&str).unwrap_or("err")
                                        .trim_matches('\u{0}'));
#     }
#   }
# }
# 
# fn main() {
#   App.run();
# }
```
`glMap[Named]Buffer()` 映射的是整个缓冲区，如果缓冲区越大，缓冲区映射的开销就越高。也可以通过下面的函数来映射特定范围的缓冲区：

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

`access` 是标志位，可以的取值：

| 标志                          | 说明                                                 |
|:-----------------------------|:----------------------------------------------------|
| GL_MAP_READ_BIT              | 可以通过缓冲区映射读取                                  |
| GL_MAP_WRITE_BIT             | 可以通过缓冲区映射写入                                  |
| GL_MAP_PERSISTENT_BIT        | 持久映射                                             |
| GL_MAP_COHERENT_BIT          | 缓冲映射图是连贯的                                     |
| GL_MAP_INVALIDATE_RANGE_BIT  | 表示我们不再关心范围内数据，与 GL_MAP_READ_BIT 冲突       |
| GL_MAP_INVALIDATE_BUFFER_BIT | 表示我们不再关心整个缓冲区内的数据，与 GL_MAP_READ_BIT 冲突 |
| GL_MAP_FLUSH_EXPLICIT_BIT    | 表示我们会在映射范围内修改数据                           |
| GL_MAP_UNSYNCHRONIZED_BIT    | 表示我们会自己会自己执行所有的同步                        |

其中 `GL_MAP_READ_BIT`、`GL_MAP_WRITE_BIT`、`GL_MAP_PERSISTENT_BIT`、`GL_MAP_COHERENT_BIT` 必须和 `gl[Named]BufferStorage` 的 `flag` 相匹配，其作用相同。

- `GL_MAP_INVALIDATE_RANGE_BIT`：在映射范围之前的数据可能会丢弃，而映射到 CPU 的那段缓冲区将会被擦除
- `GL_MAP_INVALIDATE_BUFFER_BIT`：在将缓冲区映射到 CPU 时，缓冲区内所有数据将被擦除

这里使用 0xFF 初始化缓冲区，再缓冲区内 15~45 字节 以 `GL_MAP_INVALIDATE_RANGE_BIT | GL_MAP_WRITE_BIT` 映射到 CPU：

```rust
# use sb7::application::Application;
# use std::mem::size_of_val as sizeof;
# use std::ptr::null;
# struct App;
# 
# fn print_buf(buf: [u8; 15 * 6]) {
#   for j in 0..6 {
#     for i in 0..15 {
#       print!("{:-02X}, ", buf[j * 15 + i])
#     }
#     println!()
#   }
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       gl::NamedBufferStorage(buf,
#                              15 * 6,
#                              null(),
#                              gl::MAP_READ_BIT | gl::MAP_WRITE_BIT |
#                              gl::DYNAMIC_STORAGE_BIT);
#       {
        let data = [255u8; 15 * 6];
        gl::NamedBufferSubData(buf, 0, sizeof(&data) as _,
                               data.as_ptr() as _);
#       }
#       {
        let ptr = gl::MapNamedBufferRange(buf, 15, 30,
                                          gl::MAP_WRITE_BIT |
                                          gl::MAP_INVALIDATE_BUFFER_BIT);
        assert_ne!(ptr as usize, 0, "MapNamedBufferRange() failed");
        gl::UnmapNamedBuffer(buf);
#       }
#       {
        let ptr = gl::MapNamedBuffer(buf, gl::READ_ONLY);
#         assert_ne!(ptr as usize, 0, "MapBuffer() failed");

        let mut read = [0u8; 15 * 6];
        std::ptr::copy(ptr as _, read.as_mut_ptr(), 120);
# 
        gl::UnmapNamedBuffer(buf);
# 
        print_buf(read);
#       }
#     }
#   }
# }
# 
# fn main() {
#   App.run();
# }
```
`print_buf()` 输出如下：

```
FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF 
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 
FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF 
FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF 
FF FF FF FF FF FF FF FF FF FF FF FF FF FF FF
```

在缓冲区映射的时候那段内存已经被清零了。如果给 `Map[Named]BufferRange()` 传入 `MAP_INVALIDATE_BUFFER_BIT`，那么整个缓冲区在映射时会被清零

### 填充数据、缓冲区间复制数据

填充数据<sub>作者在整本书里就没有用过这个函数</sub>……：

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
- `type` `format` 说明指向 `data` 的数据的信息
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
- `format`: 传入的数据格式
  - `RED`、`GREEN`、`BLUE`、`RED_INTEGER`、`GREEN_INTEGER`、`BLUE_INTEGER`
  - `RG`、`RG_INTEGER`
  - `RGB`、`BGR`、`RGB_INTEGER`、`BGR_INTEGER`
  - `RGBA`、`BGRA`、`RGBA_INTEGER`、`BGRA_INTEGER`
- `internalformat`：buffer 内部存储的数据格式，参考 [gl4/glClearBufferSubData](https://docs.gl/gl4/glClearBufferSubData)


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

在缓冲区之间复制，类似于 C 里的 `memcpy()` 或者 `strcpy()`（Rust 里对应`std::intrinsics::copy`）:

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

`glCopyBufferSubData()` 需要两个不同的绑定点。 openGL 也提供了 GL_COPY_READ_BUFFER 和 GL_COPY_WRITE_BUFFER 这两个靶点，这时候就可以用上了。

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

### 将缓冲区作为顶点着色器的输入

顶点着色器的输入——顶点数组对象(vao)，用来存储顶点数组的状态，可以绑定多个缓冲区，将缓冲区的内容传入顶点着色器。创建 vao：

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
#   fn shutdown(&mut self) {
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

建立顶点着色器里顶点属性与缓冲区的关系，将 bindingindex 对应的缓冲区作为顶点属性 attribindex 的输入：

```c
void glVertexArrayAttribBinding(GLuint vaobj,
                                GLuint attribindex,
                                GLuint bindingindex);
```

- `attribindex` 顶点属性的位置，可以用 `glGetAttribLocation()` 查询，或者直接在顶点着色器里指定
- `bindingindex` vao绑定的顶点缓冲区下标

`glVertexArrayVertexBuffer()` 用来将缓冲区挂载到 vao 上： 

```c
void glVertexArrayVertexBuffer(GLuint vaobj,
                               GLuint bindingindex,
                               GLuint buffer,
                               GLintptr offset,
                               GLsizei stride);
```
- `bindingindex`: 可以随便设，指定缓冲区在 vao 的位置，和 `glVertexArrayAttribBinding()` 对应
- `buffer`: 要挂载到 vao 的缓冲区
- `offset`: 偏移量（起始位置），字节为单位，着色器从哪里开始读入顶点数据
- `stride`: 每个顶点数据的大小，字节为单位

将两个缓冲区对象挂载到 vao 上，分别作为着色器内两个顶点属性的输入：

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
    let mut vao = 0;
#     unsafe {
      gl::CreateVertexArrays(1, &mut vao);
      gl::BindVertexArray(vao);
#     }
# 
#     // 创建 buffer，初始化 buffer
    let mut bufs = [0; 2];
#     unsafe {
      gl::CreateBuffers(2, bufs.as_mut_ptr());
      gl::BindBuffer(gl::VERTEX_ARRAY, bufs[0]);
      gl::BindBuffer(gl::VERTEX_ARRAY, bufs[1]);
      gl::NamedBufferStorage(bufs[0], size_of_val(&position) as isize,
                             position.as_ptr() as *const c_void,
                             gl::DYNAMIC_STORAGE_BIT);
      gl::NamedBufferStorage(bufs[1], size_of_val(&color) as isize,
                             color.as_ptr() as *const c_void,
                             gl::DYNAMIC_STORAGE_BIT);
# 
#     }

#     // 绑定 buffer 与 vao
#     unsafe {
      gl::VertexArrayVertexBuffer(vao, 0, bufs[0], 0,
                                  (size_of::<f32>() * 4) as i32);
      gl::VertexArrayVertexBuffer(vao, 1, bufs[1], 0,
                                  (size_of::<f32>() * 4) as i32);
#     }

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
#   fn shutdown(&mut self) {
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

在通过 vao 搭建好缓冲区与顶点属性的桥梁之后，还需要给 OpenGL 说明顶点属性的格式（顶点属性由几个元素组成，每个元素的数据类型是什么）：

```c
void glVertexArrayAttribFormat(GLuint vaobj,
                               GLuint attribindex,
                               GLint size,
                               GLenum type,
                               GLboolean normalized,
                               GLuint relativeoffset);
```

- `size`: 这个顶点属性由几个数组成：1、2、3、4
- `type`: 数据类型：GL::FLOAT, GL::UCHAT 等
- `normalized`: 在传入着色器之前，是否对数据进行正规化处理。浮点数不会进行正规化
  - 无符号整数转换成 \[0.0~1.0\] 的浮点数
  - 有符号整数转换成 \[-1.0~1.0\] 的浮点数
- relativeoffset： 相对偏移量
  - 第 n 个顶点在在缓冲区的读取位置与offset, relativeoffset 的关系：
  
  ```
  location = offset + n * stride + relativeoffset
  ```

之后就可以调用 `glEnableVertexArrayAttrub()` 来启用之前的配置了：

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
#   fn shutdown(&mut self) {
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
#   fn shutdown(&mut self) {
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
结果大概长这样：

{% raw %}
<div class="demo_app" id="_ch5_1_vao"></div>
{% endraw %}



也可以将顶点属性放到一个结构体里，然后存到同一个缓冲区上：

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
      Vertex { x:  0.5, y: -0.5, z: 0.0, r: 0.0, g: 1.0, b: 0.0 },
      Vertex { x:  0.0, y:  0.5, z: 0.0, r: 0.0, g: 0.0, b: 1.0 },
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
#   fn shutdown(&mut self) {
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
对于将所有顶点数据存到同一个缓冲区的情况，也可以用 `glVertexAttribPointer()` 向顶点着色器传入数据：

```c
void glVertexAttribPointer(GLuint index,
                           GLint size,
                           GLenum type,
                           GLboolean normalized,
                           GLsizei stride,
                           const GLvoid * pointer);
```
- `index`：顶点属性在着色器的位置（顶点属性）
- `size`：顶点属性包含的数据个数：1、2、3、4、……
- `type`：数据类型：`GL_FLOAT`、`GL_UNSIGNED_BYTE`……
- `normalized`：是否进行正规化处理
- `stride`：所有顶点属性的大小之和，字节为单位
- `pointer`：顶点属性数据相对与 `stride` 的位置

使用前提：
1. 已经创建 vao 并绑定到 OpenGL 环境里
2. 已经创建好缓冲区对象，填充数据后绑定到 `GL_ARRAY_BUFFER` 上

用 `glVertexAttribPointer()` 重写上面的例子，整个配置过程非常简便：

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
# use std::ffi::CString;
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
#     unsafe {
      let vertices_data = [
        // position               // color
        -0.5, -0.5, 0.0, 1.0,     1.0, 0.0, 0.0, 1.0, 
         0.5, -0.5, 0.0, 1.0,     0.0, 1.0, 0.0, 1.0,
         0.0,  0.5, 0.0, 1.0,     0.0, 0.0, 1.0, 1.0f32,
      ];

      let mut vao = 0;
      gl::CreateVertexArrays(1, &mut vao);
      gl::BindVertexArray(vao);

      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);
      gl::NamedBufferStorage(buf, size_of_val(&vertices_data) as _,
                             vertices_data.as_ptr() as _,
                             gl::DYNAMIC_STORAGE_BIT);

      gl::BindBuffer(gl::ARRAY_BUFFER, buf);
      gl::VertexAttribPointer(0, 4, gl::FLOAT, gl::FALSE,
                              (8 * size_of::<f32>()) as _, 0 as _);
      gl::VertexAttribPointer(1, 4, gl::FLOAT, gl::FALSE,
                             (8 * size_of::<f32>()) as _,
                             (4 * size_of::<f32>()) as _);
      gl::EnableVertexArrayAttrib(vao, 0);
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
#   fn shutdown(&mut self) {
#     unsafe {
#       gl::DeleteBuffers(1, &self.buf);
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
## Uniform 变量

uniform 变量可以在任何着色器里声明，是一种很重要的数据形式，可以理解为着色器暴露给 OpenGL 应用程序的全局变量。可以在 OpenGL 应用程序里将数据直接传递给着色器。最常见的 uniform 变量应该就是变换矩阵了。

声明 uniform 变量：

```glsl
uniform float time;
uniform int index;
uniform vec4 color;
uniform mat4 vpmat;
```
在着色器里不能对 uniform 变量赋值，只能在声明的时候赋初值：

```glsl
uniform float a = 12;
```

### 向 uniform 变量传递数据

先用 `glGetUniformLocation()` 查询 uniform 变量在哪，再用 `glUniform*()` 给 uniform 变量传递数据（类似于赋值）：

```c
GLint glGetUniformLocation(GLuint program,
                           const GLchar *name);

void glUniform1f(GLint location,
                 GLfloat v0);
void glUniform2f(GLint location,
                 GLfloat v0,
                 GLfloat v1);
...
```
可以在 docs.gl 查看所有的 `glUniform*()` 函数：https://docs.gl/gl4/glUniform

对于这两个 uniform 变量：

```glsl
uniform float time;
uniform vec3 offset;
```
在 OpenGL 应用程序里给它们赋值：

```rust
let name = CString::new("time").unwrap();
let ltime = gl::GetUniformLocation(program, name.as_ptr());
gl::Uniform1f(ltime, 1.0);

let name = CString::new("offset").unwrap();
let loffset = gl::GetUniformLocation(program, name.as_ptr());
gl::Uniform3f(loffset, 1.0, 2.0, 3.0);
```

也可以在着色器里直接指定 uniform 变量的位置:

```glsl
layout (location = 0) uniform float time;
layout (location = 1) uniform int index;
layout (location = 2) uniform vec4 color;
layout (location = 3) uniform bool flag;
```

这样就不需要调用 `GetUniformLocation()` 了：

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

用 `Uniform4fv()` 传 vec4 变量：

```glsl glsl:
uniform vec4 vcolor;
```

```rust rust:
let vcolor = [1.0, 1.0, 1.0, 1.0];
gl::Uniform4fv(vcolor_location, 1, vcolor.as_ptr());
```

传递数组，将 `glUniform4fv()` 的 count 设置为数组长度就行：

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

```rust
# use gl::types::GLuint;
# use sb7::application::Application;
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
      let mv_mat = sb7::vmath::rotate(0.0, _current_time as f32 * 45.0, 0.0);
      let name = CString::new("mv_mat").unwrap();
      let location_mv_mat = gl::GetUniformLocation(self.program,
                                                   name.as_ptr() as _);
      gl::UniformMatrix4fv(location_mv_mat, 1,
                           gl::FALSE, addr_of!(mv_mat) as _);
# 
#       gl::ClearBufferfv(gl::COLOR,0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::DrawArrays(gl::TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&mut self) {
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

`glUniformMatrix4fv()` 原型如下：

```c
void glUniformMatrix4fv(GLint location,
                        GLsizei count,
                        GLboolean transpose,
                        const GLfloat *value);
```
- `count`：矩阵个数，传 mat4 数组的时候传元素个数
- `transpose`：传递时是否将矩阵转置，如果线性代数库里的矩阵是以行优先存储的，需要设置为 GL_TRUE，来对矩阵进行转置，以符合 OpenGL 的期望格式

__通过 uniform 变量设置变换矩阵__

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

将变换矩阵和投影矩阵写入 uniform 变量：

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

### Uniform 区块

如果程序成千上万的 uniform 变量意味着将会有很多散落在各处的`glUniform*()`（难以维护）。将 uniform 变量塞到一个块结构(uniform 区块)里，uniform 区块的数据和缓冲区对象绑定，从而降低调用 `glUniform*()`的开销。

和 uniform 区块相绑定的缓冲区称为 ubo

__声明__

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

和结构体类似，访问成员：`transform.scale`

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

这样子就可以给 transforms[0] 和 transforms[1] 分配绑定不同的缓冲区对象了。

访问：

```glsl
gl_Position =  transforms[0].projection_matrix * vec4(0.0);
```
__UBO的内存格式__

- 标准布局：
  - 数据类型的大小 N 字节，则数据的存储位置为 N 字节的整数倍：
    - int float bool：在 glsl 占用 4 字节，在缓冲区的存储地址为 4 的整数倍
  - 数据类型的大小 N 字节，则二维向量 与 2 * N 字节对齐
    - vec2 的存储位置与 2 * 4 = 8 字节对齐
  - 数据类型的大小 N 字节，三维、四维向量与 4 * N 字节对齐
    - vec3, vec4 的存储位置与 16字节对齐
  - 数组：每个元素和 4 * N 字节对齐
  - 完整规则参考：[OpenGL 4.6规范](https://www.khronos.org/registry/OpenGL/specs/gl/glspec46.core.pdf) `7.6.2.2 Standard Uniform Block Layout`
  - 好处：可以预知 uniform 区块内的数据位置，因为这些在标准里已经定义好了，所有 OpenGL 实现都遵循这这个标准
  - 坏处：数据对进行对齐，稍微浪费空间
- shared 布局：
  让 OpenGL 根据 uniform 区块的成员，自行决定其存储位置，会比标准布局高效，但是无法预知数据的存储位置，只能向 openGL 查询成员的位置后才能向 uniform 区块写入数据

使用标准布局：在 uniform 关键字前加上 `layout(std140)`

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

也可以直接指定 uniform 块内部成员的起始位置：

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

shared 布局 OpenGL 使用的默认布局，定义的时候不用加任何修饰符：

```glsl
uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms;
```

在这个布局下，OpenGL会自己为 uniform 块的成员分配内存位置，这时候就不能自行指定成员起始位置：

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

__查询 uniform 区块成员的存储位置__

在 shared 布局下需要自己向 OpenGL 查询数据的位置和大小，因为OpenGL会按照自己的方式对数据的存放方式进行优化，此时在 OpenGL 程序里无法预知数据的位置，只能向 OpenGL 查询数据到底存在哪。查询过程：

查询某一成员在 uniform 区块里的位置：

```c
void glGetUniformIndices(GLuint program,
                         GLsizei uniformCount,
                         const GLchar **uniformNames,
                         GLuint *uniformIndices);
```
- `program`：uniform 区块所在的着色器程序
- `count`：要查询的成员个数，一般传 `uniformNames` 数组的元素个数
- `uniformNames`：要查询的成员，字符串数组
- `uniformIndices`：保存返回的成员位置

```glsl
uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms;
```

```rust
# use gl::types::*;
# use sb7::application::Application;
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
#     let program = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs,gl::FRAGMENT_SHADER, true)
#     ], true);
# 
#     use std::ffi::CString;
    let uniform_names = [CString::new("TransformBlock.rotate"),
                         CString::new("TransformBlock.scale"),
                         CString::new("TransformBlock.translation"),
                         CString::new("TransformBlock.projection_matrix")];
    
    // 指向字符串的指针数组
    let uniform_names = uniform_names.iter()
                                     .map(|s| s.as_ref().unwrap().as_ptr())
                                     .collect::<Box<[_]>>();
    let mut uniform_indices = [0u32; 4];
    unsafe {
      gl::GetUniformIndices(program, 4,
                            uniform_names.as_ptr(),
                            uniform_indices.as_mut_ptr());
    }
#     // [2, 0, 1, 3]
#     println!("{:?}", uniform_indices);
#   }
#   fn shutdown(&mut self) {
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

通过返回的 `uniformIndices` 数组和 `glGetActiveUniformsiv()` 查询成员在缓冲区的位置、占用大小等信息：

```c
void glGetActiveUniformsiv(GLuint program,
                           GLsizei uniformCount,
                           const GLuint *uniformIndices,
                           GLenum pname,
                           GLint *params);
```
- `uniformIndices`、`uniformCount`：之前 `glGetUniformIndices()` 返回的数组
- `pname`：要查询的信息：
  | pname 的取值     | 说明 |
  |:----------------|:----|
  | GL_UNIFORM_TYPE | 成员数据类型    |
  | GL_UNIFORM_SIZE | 成员是数组的话返回数组元素个数，不是数组返回 1 |
  | GL_UNIFORM_NAME_LENGTH | 成员名称字符串长度 |
  | GL_UNIFORM_BLOCK_INDEX | 成员所属区块的索引 |
  | GL_UNIFORM_OFFSET      | __成员在区块内的存储位置__ |
  | GL_UNIFORM_ARRAY_STRIDE | 如果成员是数组，**返回数组每个元素的大小**，如果不是数组返回 0 |
  | GL_UNIFORM_MATRIX_STRIDE | 如果成员是矩阵，**返回矩阵每列（每行）的大小**，如果不是矩阵返回 0 |
  | GL_UNIFORM_IS_ROW_MAJOR | 如果成员是行优先矩阵返回 1，否则返回 0 |
  
- `params`：查询返回结果

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
    let uniform_names = [CString::new("TransformBlock.rotate"),
                         CString::new("TransformBlock.scale"),
                         CString::new("TransformBlock.translation"),
                         CString::new("TransformBlock.projection_matrix")];
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
#   fn shutdown(&mut self) {
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

这样就得到各个成员在缓冲区的位置和占用大小了：

```rust
# use gl::types::*;
# use sb7::application::Application;
# 
# #[derive(Default)]
# struct App {
#   program: GLuint,
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
    let vs = "#version 460 core
    uniform TransformBlock {
      float scale;
      vec3 translation;
      float rotate[3];
      mat4 projection_matrix;
    } transforms;

    void main() {
      gl_Position =  transforms.projection_matrix * vec4(0.0);
    }";
# 
#     let fs = "#version 460 core
#     out vec4 color;
#     void main() {
#       color = vec4(1.0);
#     }";
# 
#     let program = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs,gl::FRAGMENT_SHADER, true)
#     ], true);
# 
#     use std::ffi::CString;
    let uniform_names = [CString::new("TransformBlock.rotate"),
                         CString::new("TransformBlock.scale"),
                         CString::new("TransformBlock.translation"),
                         CString::new("TransformBlock.projection_matrix")];
#     
#     // 指向字符串的指针数组
#     let uniform_names = uniform_names.iter()
#                                      .map(|s| s.as_ref().unwrap().as_ptr())
#                                      .collect::<Box<[_]>>();
#     let mut uniform_indices = [0u32; 4];
#     unsafe {
#       gl::GetUniformIndices(program, 4,
#                             uniform_names.as_ptr(),
#                             uniform_indices.as_mut_ptr());
#     }
#     // [2, 0, 1, 3]
#     println!("{:?}", uniform_indices);
# 
#     let mut offsets     = [0i32; 4];
#     let mut arr_strides = [0i32; 4];
#     let mut mat_strides = [0i32; 4];
# 
#     unsafe {
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_OFFSET,
#                               offsets.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_ARRAY_STRIDE,
#                               arr_strides.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_MATRIX_STRIDE,
#                               mat_strides.as_mut_ptr());
#     }
# 
    println!("rotate: offset = {}, stride = {}",
              offsets[0], arr_strides[0]);
    println!("scale: offset = {}", offsets[1]);
    println!("translation: offset = {}", offsets[2]);
    println!("projection_matrix: offset = {}, stride = {}",
              offsets[3], mat_strides[3]);

#   }
#   fn shutdown(&mut self) {
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
```txt 输出：
rotate: offset = 28, stride = 4
scale: offset = 0
translation: offset = 16
projection_matrix: offset = 48, stride = 16
```

```glsl
uniform TransformBlock {
  float scale;
  vec3 translation;
  float rotate[3];
  mat4 projection_matrix;
} transforms;
```

```rust
let uniform_names = [CString::new("TransformBlock.rotate"),
                     CString::new("TransformBlock.scale"),
                     CString::new("TransformBlock.translation"),
                     CString::new("TransformBlock.projection_matrix")];
```

在查询 uniform 区块的内存布局之后，分配内存，写入数据。最简单的情况，写入 float 变量：

```rust
let data = Box::new([0u8; 4096]);
let ptr =  data.as_ptr();

unsafe {
  let offset = offsets[1] as usize;
  *(ptr.add(offset) as *mut f32) = 3.0f32;
}
```

写入 vec3 变量：

```rust
unsafe {
  let offset = offsets[2] as usize;
  *(ptr.add(offset) as *mut f32).add(0) = 1.0f32;
  *(ptr.add(offset) as *mut f32).add(1) = 2.0f32;
  *(ptr.add(offset) as *mut f32).add(2) = 3.0f32;
}
```

写入数组：

```rust
let rotates: [f32; 3] = [30.0, 40.0, 50.0];
unsafe {
  let mut offset = offsets[0] as usize;
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
for col in 0..4 {
  let mut offset = offsets[3] as usize
                 + mat_strides[3] as usize * col;
  for row in 0..4 {
    unsafe { *(ptr.add(offset) as *mut f32) = mat[col * 4 + row] };
    offset += std::mem::size_of::<f32>();
  }
}
```

__绑定 uniform 区块和缓冲区对象__

创建缓冲对象，将上面准备好的内存写入缓冲：

```rust
# use gl::types::*;
# use sb7::application::Application;
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
#     let program = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs,gl::FRAGMENT_SHADER, true)
#     ], true);
# 
#     use std::ffi::CString;
#     let uniform_names = [CString::new("TransformBlock.rotate"),
#                          CString::new("TransformBlock.scale"),
#                          CString::new("TransformBlock.translation"),
#                          CString::new("TransformBlock.projection_matrix")];
#     
#     // 指向字符串的指针数组
#     let uniform_names = uniform_names.iter()
#                                      .map(|s| s.as_ref().unwrap().as_ptr())
#                                      .collect::<Box<[_]>>();
#     let mut uniform_indices = [0u32; 4];
#     unsafe {
#       gl::GetUniformIndices(program, 4,
#                             uniform_names.as_ptr(),
#                             uniform_indices.as_mut_ptr());
#     }
#     // [2, 0, 1, 3]
#     println!("{:?}", uniform_indices);
# 
#     let mut offsets     = [0i32; 4];
#     let mut arr_strides = [0i32; 4];
#     let mut mat_strides = [0i32; 4];
# 
#     unsafe {
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_OFFSET,
#                               offsets.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_ARRAY_STRIDE,
#                               arr_strides.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_MATRIX_STRIDE,
#                               mat_strides.as_mut_ptr());
#     }
# 
#     println!("rotate: offset = {}, stride = {}",
#               offsets[0], arr_strides[0]);
#     println!("scale: offset = {}", offsets[1]);
#     println!("translation: offset = {}", offsets[2]);
#     println!("projection_matrix: offset = {}, stride = {}",
#               offsets[3], mat_strides[3]);
# 
#     let data = Box::new([0u8; 4096]);
#     let ptr =  data.as_ptr();
#     
#     unsafe {
#       let offset = offsets[1] as usize;
#       *(ptr.add(offset) as *mut f32) = 3.0f32;
#     }
# 
#     unsafe {
#       let offset = offsets[2] as usize;
#       *(ptr.add(offset) as *mut f32).add(0) = 1.0f32;
#       *(ptr.add(offset) as *mut f32).add(1) = 2.0f32;
#       *(ptr.add(offset) as *mut f32).add(2) = 3.0f32;
#     }
# 
#     let rotates: [f32; 3] = [30.0, 40.0, 50.0];
#     unsafe {
#       let mut offset = offsets[0] as usize;
#       for i in 0..3 {
#         *(ptr.add(offset) as *mut f32) = rotates[i];
#         offset += arr_strides[0] as usize;
#       }
#     }
# 
#     let mat : [f32; 16]=  [ 1.0, 2.0, 3.0, 4.0,
#                             9.0, 8.0, 7.0, 6.0,
#                             2.0, 4.0, 6.0, 8.0,
#                             1.0, 3.0, 5.0, 7.0 ];
#     for col in 0..4 {
#       let mut offset = offsets[3] as usize
#                     + mat_strides[3] as usize * col;
#       for row in 0..4 {
#         unsafe { *(ptr.add(offset) as *mut f32) = mat[col * 4 + row] };
#         offset += std::mem::size_of::<f32>();
#       }
#     }
# 
    let mut uniform_buf = 0;
    unsafe {
      gl::CreateBuffers(1, &mut uniform_buf);
      gl::NamedBufferStorage(uniform_buf, data.len() as _,
                             data.as_ptr() as _, gl::DYNAMIC_STORAGE_BIT);
# 
#       gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, uniform_buf);
#       
#       let name = CString::new("TransformBlock").unwrap();
#       let uniform_blk_index = gl::GetUniformBlockIndex(program, name.as_ptr());
#       gl::UniformBlockBinding(program, uniform_blk_index, 0);
    }
#   }
#   fn shutdown(&mut self) {
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

用 `glBindBufferBase()` 将缓冲区绑定到 `GL_UNIFORM_BUFFER`：

```c
void glBindBufferBase(GLenum target,
                      GLuint index,
                      GLuint buffer);
```

- `index`：自己给缓冲区指定的绑定下标，后面调 `glUniformBlockBinding()` 的时候要用

```rust
# use gl::types::*;
# use sb7::application::Application;
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
#     let program = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs,gl::FRAGMENT_SHADER, true)
#     ], true);
# 
#     use std::ffi::CString;
#     let uniform_names = [CString::new("TransformBlock.rotate"),
#                          CString::new("TransformBlock.scale"),
#                          CString::new("TransformBlock.translation"),
#                          CString::new("TransformBlock.projection_matrix")];
#     
#     // 指向字符串的指针数组
#     let uniform_names = uniform_names.iter()
#                                      .map(|s| s.as_ref().unwrap().as_ptr())
#                                      .collect::<Box<[_]>>();
#     let mut uniform_indices = [0u32; 4];
#     unsafe {
#       gl::GetUniformIndices(program, 4,
#                             uniform_names.as_ptr(),
#                             uniform_indices.as_mut_ptr());
#     }
#     // [2, 0, 1, 3]
#     println!("{:?}", uniform_indices);
# 
#     let mut offsets     = [0i32; 4];
#     let mut arr_strides = [0i32; 4];
#     let mut mat_strides = [0i32; 4];
# 
#     unsafe {
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_OFFSET,
#                               offsets.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_ARRAY_STRIDE,
#                               arr_strides.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_MATRIX_STRIDE,
#                               mat_strides.as_mut_ptr());
#     }
# 
#     println!("rotate: offset = {}, stride = {}",
#               offsets[0], arr_strides[0]);
#     println!("scale: offset = {}", offsets[1]);
#     println!("translation: offset = {}", offsets[2]);
#     println!("projection_matrix: offset = {}, stride = {}",
#               offsets[3], mat_strides[3]);
# 
#     let data = Box::new([0u8; 4096]);
#     let ptr =  data.as_ptr();
#     
#     unsafe {
#       let offset = offsets[1] as usize;
#       *(ptr.add(offset) as *mut f32) = 3.0f32;
#     }
# 
#     unsafe {
#       let offset = offsets[2] as usize;
#       *(ptr.add(offset) as *mut f32).add(0) = 1.0f32;
#       *(ptr.add(offset) as *mut f32).add(1) = 2.0f32;
#       *(ptr.add(offset) as *mut f32).add(2) = 3.0f32;
#     }
# 
#     let rotates: [f32; 3] = [30.0, 40.0, 50.0];
#     unsafe {
#       let mut offset = offsets[0] as usize;
#       for i in 0..3 {
#         *(ptr.add(offset) as *mut f32) = rotates[i];
#         offset += arr_strides[0] as usize;
#       }
#     }
# 
#     let mat : [f32; 16]=  [ 1.0, 2.0, 3.0, 4.0,
#                             9.0, 8.0, 7.0, 6.0,
#                             2.0, 4.0, 6.0, 8.0,
#                             1.0, 3.0, 5.0, 7.0 ];
#     for col in 0..4 {
#       let mut offset = offsets[3] as usize
#                     + mat_strides[3] as usize * col;
#       for row in 0..4 {
#         unsafe { *(ptr.add(offset) as *mut f32) = mat[col * 4 + row] };
#         offset += std::mem::size_of::<f32>();
#       }
#     }
# 
    let mut uniform_buf = 0;
    unsafe {
      gl::CreateBuffers(1, &mut uniform_buf);
      gl::NamedBufferStorage(uniform_buf, data.len() as _,
                             data.as_ptr() as _, gl::DYNAMIC_STORAGE_BIT);

      gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, uniform_buf);
#       
#       let name = CString::new("TransformBlock").unwrap();
#       let uniform_blk_index = gl::GetUniformBlockIndex(program, name.as_ptr());
#       gl::UniformBlockBinding(program, uniform_blk_index, 0);
    }
#   }
#   fn shutdown(&mut self) {
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

用 `glGetUniformBlockIndex()` 查询 uniform 区块的位置：

```c
GLuint glGetUniformBlockIndex(GLuint program,
                              const GLchar *uniformBlockName);
```

```rust
# use gl::types::*;
# use sb7::application::Application;
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
#     let program = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs,gl::FRAGMENT_SHADER, true)
#     ], true);
# 
#     use std::ffi::CString;
#     let uniform_names = [CString::new("TransformBlock.rotate"),
#                          CString::new("TransformBlock.scale"),
#                          CString::new("TransformBlock.translation"),
#                          CString::new("TransformBlock.projection_matrix")];
#     
#     // 指向字符串的指针数组
#     let uniform_names = uniform_names.iter()
#                                      .map(|s| s.as_ref().unwrap().as_ptr())
#                                      .collect::<Box<[_]>>();
#     let mut uniform_indices = [0u32; 4];
#     unsafe {
#       gl::GetUniformIndices(program, 4,
#                             uniform_names.as_ptr(),
#                             uniform_indices.as_mut_ptr());
#     }
#     // [2, 0, 1, 3]
#     println!("{:?}", uniform_indices);
# 
#     let mut offsets     = [0i32; 4];
#     let mut arr_strides = [0i32; 4];
#     let mut mat_strides = [0i32; 4];
# 
#     unsafe {
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_OFFSET,
#                               offsets.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_ARRAY_STRIDE,
#                               arr_strides.as_mut_ptr());
#       gl::GetActiveUniformsiv(program, 4, uniform_indices.as_ptr(),
#                               gl::UNIFORM_MATRIX_STRIDE,
#                               mat_strides.as_mut_ptr());
#     }
# 
#     println!("rotate: offset = {}, stride = {}",
#               offsets[0], arr_strides[0]);
#     println!("scale: offset = {}", offsets[1]);
#     println!("translation: offset = {}", offsets[2]);
#     println!("projection_matrix: offset = {}, stride = {}",
#               offsets[3], mat_strides[3]);
# 
#     let data = Box::new([0u8; 4096]);
#     let ptr =  data.as_ptr();
#     
#     unsafe {
#       let offset = offsets[1] as usize;
#       *(ptr.add(offset) as *mut f32) = 3.0f32;
#     }
# 
#     unsafe {
#       let offset = offsets[2] as usize;
#       *(ptr.add(offset) as *mut f32).add(0) = 1.0f32;
#       *(ptr.add(offset) as *mut f32).add(1) = 2.0f32;
#       *(ptr.add(offset) as *mut f32).add(2) = 3.0f32;
#     }
# 
#     let rotates: [f32; 3] = [30.0, 40.0, 50.0];
#     unsafe {
#       let mut offset = offsets[0] as usize;
#       for i in 0..3 {
#         *(ptr.add(offset) as *mut f32) = rotates[i];
#         offset += arr_strides[0] as usize;
#       }
#     }
# 
#     let mat : [f32; 16]=  [ 1.0, 2.0, 3.0, 4.0,
#                             9.0, 8.0, 7.0, 6.0,
#                             2.0, 4.0, 6.0, 8.0,
#                             1.0, 3.0, 5.0, 7.0 ];
#     for col in 0..4 {
#       let mut offset = offsets[3] as usize
#                     + mat_strides[3] as usize * col;
#       for row in 0..4 {
#         unsafe { *(ptr.add(offset) as *mut f32) = mat[col * 4 + row] };
#         offset += std::mem::size_of::<f32>();
#       }
#     }
# 
    let mut uniform_buf = 0;
    unsafe {
      gl::CreateBuffers(1, &mut uniform_buf);
      gl::NamedBufferStorage(uniform_buf, data.len() as _,
                             data.as_ptr() as _, gl::DYNAMIC_STORAGE_BIT);

      gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, uniform_buf);
      
      let name = CString::new("TransformBlock").unwrap();
      let uniform_blk_index = gl::GetUniformBlockIndex(program,
                                                       name.as_ptr());
#       gl::UniformBlockBinding(program, uniform_blk_index, 0);
    }
#   }
#   fn shutdown(&mut self) {
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
最后用 `glUniformBlockBinding()` 将缓冲区对象与 uniform 区块向绑定：

```c
void glUniformBlockBinding(GLuint program,
                           GLuint uniformBlockIndex,
                           GLuint uniformBlockBinding);
```
- `uniformBlockIndex`：`glGetUniformBlockIndex()` 返回的 uniform 区块下标
- `uniformBlockBinding`：缓冲区对象调用 `glBindBufferBase()` 时设置的 `index`

这样就完成了缓冲区对象和 uniform 区块之间的绑定

缓冲区对象和 uniform 区块之间的关系：

![uniform block and buffers match](./uniform_blk_buffers.png)

上图对应的处理代码如下：

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

uniform  区块的绑定的缓冲区对象下标也可以在着色器里指定：

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

```rust
gl::BindBufferBase(gl::UNIFORM_BUFFER, 1, buf_c);
gl::BindBufferBase(gl::UNIFORM_BUFFER, 3, buf_a);
gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, buf_b);
```

回到之前使用标准布局的 uniform 区块，根据规范可以推断出各个成员的位置：

```glsl
layout(std140) uniform TransformBlock {
  float scale;            // offset: 0
  vec3 translation;       // offset: 16
  float rotate[3];        // offset: 32, stride: 16
  mat4 projection_matrix; // offset: 80, stride: 16
} transforms;
```
现在可以用 `glGetActiveUniformsiv()` 来验证了：

```rust
# use std::ffi::CString;
# use sb7::application::Application;
# 
# #[derive(Default)]
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     let vs = "
#     #version 460 core
# 
#     layout(std140) uniform TransformBlock {
#       float scale;
#       vec3 translation;
#       float rotate[3];
#       mat4 projection_matrix;
#     } trans;
# 
#     void main() {
#       gl_Position = trans.scale * vec4(1.0);
#     }
#     ";
# 
#     let fs = "
#     #version 460 core
#     out vec4 color;
#     void main() { color = vec4(1.0); }
#     ";
# 
#     let prog = sb7::program::link_from_shaders(&[
#       sb7::shader::from_str(vs, gl::VERTEX_SHADER, true),
#       sb7::shader::from_str(fs, gl::FRAGMENT_SHADER, true),
#     ], true);
# 
#     unsafe {
      let names = [
        CString::new("TransformBlock.scale"),
        CString::new("TransformBlock.translation"),
        CString::new("TransformBlock.rotate"),
        CString::new("TransformBlock.projection_matrix"),
      ];
      let names = names.iter()
       .map(|s| s.as_ref().unwrap().as_ptr())
       .collect::<Box<[*const i8]>>();
      
      let mut indices = [0i32; 4];
      gl::GetUniformIndices(prog, 4, names.as_ptr(),
                            indices.as_mut_ptr() as _);
      assert_ne!(indices, [-1, -1, -1, -1], "glGetUniformIndices() failed");

      let mut offsets = [0; 4];
      let mut arr_strides = [0; 4];
      let mut mat_strides = [0; 4];

      gl::GetActiveUniformsiv(prog, 4, indices.as_ptr() as _,
                              gl::UNIFORM_OFFSET,
                              offsets.as_mut_ptr());
      gl::GetActiveUniformsiv(prog, 4, indices.as_ptr() as _,
                              gl::UNIFORM_ARRAY_STRIDE,
                              arr_strides.as_mut_ptr());
      gl::GetActiveUniformsiv(prog, 4, indices.as_ptr() as _,
                              gl::UNIFORM_MATRIX_STRIDE,
                              mat_strides.as_mut_ptr());
    
      assert_eq!(offsets[0], 0);  // scale
      assert_eq!(offsets[1], 16); // translation
      assert_eq!(offsets[2], 32); // rotate
      assert_eq!(arr_strides[2], 16);
      assert_eq!(offsets[3], 80); // projection_matrix
      assert_eq!(mat_strides[3], 16);
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

## 着色器存储区块

和 uniform 区块类似，着色器存储区块也需要绑定一块缓冲区对象以存储数据。除了用来向着色器传递数据以外，着色器也可以向着色器存储区块写入数据。

- 和 uniform 区块的相似之处：
  - 声明：和 uniform 区块类似，只是将 uniform 关键字替换成 buffer
  - 绑定缓冲区：也是用 `glBindBufferBase()`，只是将 `GL_UNIFORM_BUFFER` 换成 `GL_SHADER_STORAGE_BUFFER`
  - 可以指定内存布局：std140 std430
  - OpenGL 应用程序都可以通过缓冲区映射读取区块内的数据。
- 不同之处：
  - **着色器可以向着色器存储区块写入数据**
  - 支持原子操作(读取-编辑-写入 --> 一个操作)

__声明__

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
### 原子操作

只有 32 位整型（int 和 uint）才支持原子操作，可以避免数据竞争：

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

当着色器开始将数据写入缓冲区时（向着色器存储区块里的成员赋值，或者通过原子操作函数写入着色器存储区块），可能会引发内存风险

内存风险大概分为三类：

- 先读后写(RAW)风险：当程序在写入一块内存后尝试读取时，根据系统架构，读写操作可能被重新排序，使得读在写之前完成，导致旧数据返回应用程序
- 先写后写（WRW)风险：当程序连续两次写入同一块内存时，在某些架构下，无法保证第二个数据会覆盖第一个数据，导致最终进入内存的是第一个数据
- 先写后读风险（WAR）风险：只在并行处理系统里（如GPU）出现，当一个执行线程在另一线程认为自己已经读取内存后尝试将数据写入内存时会发生此风险。如果这些操作被重新排序，执行读操作的线程会读取到第二个线程写入的数据。

运行 OpenGL 的系统具有较强的管线和并行特点，包含了大量缓解和控制内存风险的机制。如果没有这些功能，OpenGL实现需要更加保守地重排和并行运行这些着色器。处理内存风险的主要工具为*内存屏障（memory barrier）*。

内存屏障基本上是一个助记符，指示 OpenGL “如果准备重新排序，需要先完成之前发送的命令，不要执行之后的命令” ，可以在 OpenGL 应用程序和着色器里插入屏障。

### 在 OpenGL 应用程序内使用屏障

在 OpenGL 应用程序的代码里插入 `glMemoryBarrier()`：

```c
void glMemoryBarrier(GLbitfield barriers);
```

`barriers` 用来说明哪些内存会受内存屏障的影响，哪些可以忽略内存屏障继续运行：

- `GL_ALL_BARRIER_BITS`：对所有的内存子系统进行同步
- `GL_SHADER_STORAGE_BARRIER_BIT`：只有在屏障之前的着色器完成数据的访问之后，才允许屏障之后的着色器运行
- `GL_UNIFORM_BARRIER_BIT`：只有在写入缓冲的着色器结束后，才允许屏障后以该缓冲作为 uniform 区块的着色器运行
- ` GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT`：等待向缓冲写入数据的着色器完成后，才允许将该缓存作为顶点属性输入的着色器运行

### 在着色器内使用屏障

在着色器里插入 `memoryBarrier()`：

```glsl
void memoryBarrier();
```

也可以使用更为具体的函数：`memoryBarrierBuffer()`

## 原子计数器

一种特殊类型的变量，表示跨多个着色器调用共享的存储。

- 原子计数器的值存储在缓冲区对象里，GLSL中提供了递增和递减原子计数器的函数。
- 如果两个着色器调用同时递增同一个原子计数器，OpenGL会让它们轮流执行。不能保证这些操f作将发生的顺序，但能保证结果正确。

在着色器内声明原子计数器：

```glsl
layout (binding = 0) uniform atomic_uint my_variable
```

binding 代表原子计数器和缓冲区对象之间的绑定点。

每个原子计数器存储在缓冲区对象中的特定偏移量处。这个偏移量可以通过 offset 限定符指定：

```glsl
layout (binding = 3, offset = 8) uniform atomic_uint my_variable;
```

存储原子计数器的缓冲区对象需要绑定到 `GL_ATOMIC_COUNTER_BUFFER` 上：

```rust
# use gl::types::*;
# use sb7::application::Application;
# use std::mem::size_of;
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);

      gl::NamedBufferData(buf,
                          16 * size_of::<GLuint>() as isize,
                          null(),
                          gl::DYNAMIC_COPY);

      // 设置绑定下标，和 shader 内的原子计数器对应
      gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 3, buf);
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

初始化存储原子计数器的缓冲区对象：

```rust
# use gl::types::*;
# use sb7::application::Application;
# use std::mem::size_of;
# use std::ptr::null;
# 
# #[derive(Default)]
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
# 
#       gl::NamedBufferData(buf,
#                           16 * size_of::<GLuint>() as isize,
#                           null(),
#                           gl::DYNAMIC_COPY);
# 
#       // 设置绑定下标，和 shader 内的原子计数器对应
#       gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 3, buf);
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
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

在初始化 buffer，并将和原子计数器绑定后，就可以在 shader 内使用原子计数器计数了。

递增计数器：

```glsl
uint atomicCounterIncrement(atomic_uint c);
```

这个函数从原子计数器读取值，将其加一，__返回原来读到的值__。

递减计数器：

```glsl
uint atomicCounterDecrement(atomic_uint c);
```

**这个函数返回减一后的值。**

查询原子计数器的值：

```glsl
uint atomicCounter(atomic_uint c);
```
通过原子计数器来计算渲染对象在屏幕上的面积：

```glsl
#version 450 core
layout (binding = 0, offset = 0) uniform atomic_uint area;

void main(void) {
  atomicCounterIncrement(area);
}
```
这个片段着色器并没有输出（out 变量），不会向帧缓冲写入任何数据。在运行这个着色器时，可以关闭向帧缓冲的写入：

```rust
gl::ColorMask(GL::FALSE, GL::FALSE, GL::FALSE, GL::FALSE);
```
等到需要渲染的时候再重新启用对缓冲区的写入：

```rust
gl::ColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
```

在使用原子计数器后，存储原子计数器的缓冲区可以绑定到其他目标上，如 `GL_UNIFORM_BUFFER`，之后就可以通过 uniform 区块来使用原子计数器的值了：

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
在 `startup()` 里可以同时将缓冲区对象绑定到 `GL_ATOMIC_COUNTER_BUFFER` 和 `GL_UNIFORM_BUFFER`，这样子这块缓冲就可以同时用作原子计数器和 uniform区块了：

```rust
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
#   fn startup(&mut self) {
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
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_src.as_ptr(), null());
#       gl::CompileShader(vs);
# 
#       let fs_counter = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs_counter, 1, &fs_counter_src.as_ptr(), null());
#       gl::CompileShader(fs_counter);
# 
#       let fs_render = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs_render, 1, &fs_render_src.as_ptr(), null());
#       gl::CompileShader(fs_render);
# 
#       self.prog_counter = gl::CreateProgram();
#       gl::AttachShader(self.prog_counter, vs);
#       gl::AttachShader(self.prog_counter, fs_counter);
#       gl::LinkProgram(self.prog_counter);
# 
#       self.prog_render = gl::CreateProgram();
#       gl::AttachShader(self.prog_render, vs);
#       gl::AttachShader(self.prog_render, fs_render);
#       gl::LinkProgram(self.prog_render);
# 
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs_counter);
#       gl::DeleteShader(fs_render);
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
#       gl::CreateVertexArrays(1, &mut vao);
# 
#       let mut vbo = 0;
#       gl::CreateBuffers(1, &mut vbo);
#       gl::NamedBufferData(vbo,
#                       size_of_val(vertex_position) as _,
#                       vertex_position.as_ptr() as _,
#                       gl::STATIC_DRAW);
# 
#       gl::VertexArrayVertexBuffer(vao, 0, vbo, 0, 3 * size_of::<f32>() as i32);
#       gl::VertexArrayAttribFormat(vao, 0, 3, gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::EnableVertexArrayAttrib(vao, 0);
#       self.vao = vao;
#       self.vbo = vbo;
#     }
# 
#     // 设置存储 原子计数器 的 buffer
#     unsafe {
      let mut buf = 0;
      gl::CreateBuffers(1, &mut buf);
      gl::NamedBufferData(buf, size_of::<u32>() as _,
                      &0u32 as *const u32 as _, gl::DYNAMIC_COPY);

      self.atombuf = buf;

      gl::BindBuffer(gl::UNIFORM_BUFFER, buf);
      gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, buf);
      gl::BindBuffer(gl::ATOMIC_COUNTER_BUFFER, buf);
      gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 0, buf);
#     }
# 
#     // 初始化投影矩阵
#     self.on_resize(800, 600);
# 
#     // 启用深度测试
#     unsafe {
#       gl::Enable(gl::DEPTH_TEST);
#     }
#   }
# 
#   fn render(&self, current_time: f64) {
#     let Self { vao,
#                proj_mat,
#                prog_render,
#                prog_counter,
#                atombuf,
#                max_area,
#                .. } = self;
# 
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR, 0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
#     }
# 
#     unsafe {
#       gl::BindVertexArray(*vao);
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
#         gl::ColorMask(gl::FALSE, gl::FALSE, gl::FALSE, gl::FALSE);
#         gl::DepthMask(gl::FALSE);
# 
#         // 使用 prog_counter 计算面积
#         gl::UseProgram(*prog_counter);
# 
#         let cptr = CString::new("trans").unwrap();
#         let location = gl::GetUniformLocation(*prog_counter, cptr.as_ptr());
#         gl::UniformMatrix4fv(location, 1, gl::FALSE, addr_of!(trans_mat) as _);
# 
#         // 重置原子计数
#         gl::NamedBufferData(*atombuf,
#                         size_of::<u32>() as _,
#                         &0u32 as *const _ as _,
#                         gl::DYNAMIC_COPY);
# 
#         gl::DrawArrays(gl::TRIANGLES, 0, 36);
# 
#         // 等待所有 shader 执行完毕
#         gl::MemoryBarrier(gl::UNIFORM_BARRIER_BIT);
# 
#         gl::ColorMask(gl::TRUE, gl::TRUE, gl::TRUE, gl::TRUE);
#         gl::DepthMask(gl::TRUE);
# 
#         // 使用 prog_render 渲染
#         gl::UseProgram(*prog_render);
# 
#         let cstr = CString::new("trans").unwrap();
#         let location = gl::GetUniformLocation(*prog_render, cstr.as_ptr());
#         gl::UniformMatrix4fv(location, 1, gl::FALSE, addr_of!(trans_mat) as _);
# 
#         let cstr = CString::new("max_area").unwrap();
#         let location = gl::GetUniformLocation(*prog_render, cstr.as_ptr());
#         gl::Uniform1f(location, *max_area);
# 
#         gl::DrawArrays(gl::TRIANGLES, 0, 36);
#       }
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as f32 / h as f32;
#     self.proj_mat = sb7::vmath::perspective(45.0, aspect, 0.1, 1000.0);
#     self.max_area = (w * h) as f32 * 0.03;
#   }
# 
#   fn shutdown(&mut self) {
#     unsafe {
#       gl::DeleteProgram(self.prog_counter);
#       gl::DeleteProgram(self.prog_render);
#       gl::DeleteVertexArrays(1, &self.vao);
#       gl::DeleteBuffers(1, &self.vbo);
#       gl::DeleteBuffers(1, &self.atombuf);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run()
# }
```

在 render 函数里，先使用原子计数器进行计数，再读取一致区块内的原子计数器的值，来渲染物体：

```rust
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
#   fn startup(&mut self) {
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
#       let vs = gl::CreateShader(gl::VERTEX_SHADER);
#       gl::ShaderSource(vs, 1, &vs_src.as_ptr(), null());
#       gl::CompileShader(vs);
# 
#       let fs_counter = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs_counter, 1, &fs_counter_src.as_ptr(), null());
#       gl::CompileShader(fs_counter);
# 
#       let fs_render = gl::CreateShader(gl::FRAGMENT_SHADER);
#       gl::ShaderSource(fs_render, 1, &fs_render_src.as_ptr(), null());
#       gl::CompileShader(fs_render);
# 
#       self.prog_counter = gl::CreateProgram();
#       gl::AttachShader(self.prog_counter, vs);
#       gl::AttachShader(self.prog_counter, fs_counter);
#       gl::LinkProgram(self.prog_counter);
# 
#       self.prog_render = gl::CreateProgram();
#       gl::AttachShader(self.prog_render, vs);
#       gl::AttachShader(self.prog_render, fs_render);
#       gl::LinkProgram(self.prog_render);
# 
#       gl::DeleteShader(vs);
#       gl::DeleteShader(fs_counter);
#       gl::DeleteShader(fs_render);
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
#       gl::CreateVertexArrays(1, &mut vao);
# 
#       let mut vbo = 0;
#       gl::CreateBuffers(1, &mut vbo);
#       gl::NamedBufferData(vbo,
#                       size_of_val(vertex_position) as _,
#                       vertex_position.as_ptr() as _,
#                       gl::STATIC_DRAW);
# 
#       gl::VertexArrayVertexBuffer(vao, 0, vbo, 0, 3 * size_of::<f32>() as i32);
#       gl::VertexArrayAttribFormat(vao, 0, 3, gl::FLOAT, gl::FALSE, 0);
#       gl::VertexArrayAttribBinding(vao, 0, 0);
#       gl::EnableVertexArrayAttrib(vao, 0);
#       self.vao = vao;
#       self.vbo = vbo;
#     }
# 
#     // 设置存储 原子计数器 的 buffer
#     unsafe {
#       let mut buf = 0;
#       gl::CreateBuffers(1, &mut buf);
#       gl::NamedBufferData(buf, size_of::<u32>() as _,
#                       &0u32 as *const u32 as _, gl::DYNAMIC_COPY);
# 
#       self.atombuf = buf;
# 
#       gl::BindBuffer(gl::UNIFORM_BUFFER, buf);
#       gl::BindBufferBase(gl::UNIFORM_BUFFER, 0, buf);
#       gl::BindBuffer(gl::ATOMIC_COUNTER_BUFFER, buf);
#       gl::BindBufferBase(gl::ATOMIC_COUNTER_BUFFER, 0, buf);
#     }
# 
#     // 初始化投影矩阵
#     self.on_resize(800, 600);
# 
#     // 启用深度测试
#     unsafe {
#       gl::Enable(gl::DEPTH_TEST);
#     }
#   }
# 
#   fn render(&self, current_time: f64) {
#     let Self { vao,
#                proj_mat,
#                prog_render,
#                prog_counter,
#                atombuf,
#                max_area,
#                .. } = self;
# 
#     unsafe {
#       gl::ClearBufferfv(gl::COLOR, 0, [0.0, 0.0, 0.0f32].as_ptr());
#       gl::ClearBufferfv(gl::DEPTH, 0, &1.0);
#     }
# 
#     unsafe {
#       gl::BindVertexArray(*vao);
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
        gl::ColorMask(gl::FALSE, gl::FALSE, gl::FALSE, gl::FALSE);
        gl::DepthMask(gl::FALSE);

        // 使用 prog_counter 计算面积
        gl::UseProgram(*prog_counter);
# 
#         let cptr = CString::new("trans").unwrap();
#         let location = gl::GetUniformLocation(*prog_counter, cptr.as_ptr());
#         gl::UniformMatrix4fv(location, 1, gl::FALSE, addr_of!(trans_mat) as _);
# 
        // 重置原子计数
        gl::NamedBufferData(*atombuf,
                        size_of::<u32>() as _,
                        &0u32 as *const _ as _,
                        gl::DYNAMIC_COPY);
# 
        gl::DrawArrays(gl::TRIANGLES, 0, 36);

        // 等待所有 shader 执行完毕
        gl::MemoryBarrier(gl::UNIFORM_BARRIER_BIT);

        gl::ColorMask(gl::TRUE, gl::TRUE, gl::TRUE, gl::TRUE);
        gl::DepthMask(gl::TRUE);

        // 使用 prog_render 渲染
        gl::UseProgram(*prog_render);
# 
#         let cstr = CString::new("trans").unwrap();
#         let location = gl::GetUniformLocation(*prog_render, cstr.as_ptr());
#         gl::UniformMatrix4fv(location, 1, gl::FALSE, addr_of!(trans_mat) as _);
# 
#         let cstr = CString::new("max_area").unwrap();
#         let location = gl::GetUniformLocation(*prog_render, cstr.as_ptr());
#         gl::Uniform1f(location, *max_area);
# 
        gl::DrawArrays(gl::TRIANGLES, 0, 36);
#       }
#     }
#   }
# 
#   fn on_resize(&mut self, w: i32, h: i32) {
#     let aspect = w as f32 / h as f32;
#     self.proj_mat = sb7::vmath::perspective(45.0, aspect, 0.1, 1000.0);
#     self.max_area = (w * h) as f32 * 0.03;
#   }
# 
#   fn shutdown(&mut self) {
#     unsafe {
#       gl::DeleteProgram(self.prog_counter);
#       gl::DeleteProgram(self.prog_render);
#       gl::DeleteVertexArrays(1, &self.vao);
#       gl::DeleteBuffers(1, &self.vbo);
#       gl::DeleteBuffers(1, &self.atombuf);
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

1. 创建纹理，设置纹理类型（`glCreateTextures()`）
2. 设置纹理大小，分配空间（`glTexStorage2D()`）

用 `glCreateTextures()` 创建纹理对象，然后使用 `glTexStorage2D()` 函数为纹理分配存储空间，使用`glBindTexture()` 将其绑定到GL_TEXTURE_2D目标：

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
# use std::{ffi::CString, ptr::{null, null_mut}};
# 
# use sb7::application::*;
use gl::*;
# use sb7::gl;
# 
# #[derive(Default)]
# struct App {
#   texture: u32,
#   prog: u32,
#   vao: u32,
# }
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
# 
#   fn log_info(&self, obj: u32, log_type: u32) {
#     let mut buf = [0u8; 2048];
# 
#     gl! {
#       match log_type {
#         COMPILE_STATUS => GetShaderInfoLog(obj, 2048, null_mut(), buf.as_mut_ptr() as _),
#         LINK_STATUS => GetProgramInfoLog(obj, 2048, null_mut(), buf.as_mut_ptr() as _),
#         _ => (),
#       };  
#     }
# 
#     
#     let str = std::str::from_utf8(&buf).unwrap_or("invaild utf-8 str");
#     println!("{}", str);
#   }
# }
# 
# impl Application for App {
#   fn startup(&mut self) {
#     gl! {
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
                        data.as_ptr() as _);
# 
#       self.texture = texture;
#     }
# 
#     let vs_src = "
#       #version 460 core
#       void main(void) {
#         const vec4 vertices[] = vec4[](vec4( 0.75, -0.75, 0.5, 1.0),
#                                        vec4(-0.75, -0.75, 0.5, 1.0),
#                                        vec4( 0.75,  0.75, 0.5, 1.0));
#         gl_Position = vertices[gl_VertexID];
#       }
#     ";
#     let vs_src = CString::new(vs_src).unwrap();
# 
#     let fs_src = "
#       #version 460 core
#       uniform sampler2D s;
#       out vec4 color;
#       void main(void) {
#         color = texture(s, gl_FragCoord.xy / textureSize(s, 0));
#       }
#     ";
#     let fs_src = CString::new(fs_src).unwrap();
#     
#     gl! {
#       let vs = CreateShader(VERTEX_SHADER);
#       ShaderSource(vs, 1, &vs_src.as_ptr(), null());
#       CompileShader(vs);
#       self.log_info(vs, COMPILE_STATUS);
# 
#       let fs = CreateShader(FRAGMENT_SHADER);
#       ShaderSource(fs, 1, &fs_src.as_ptr(), null());
#       CompileShader(fs);
#       self.log_info(fs, COMPILE_STATUS);
# 
#       let prog = CreateProgram();
#       AttachShader(prog, vs);
#       AttachShader(prog, fs);
#       LinkProgram(prog);
#       self.log_info(prog, LINK_STATUS);
# 
#       DeleteShader(vs);
#       DeleteShader(fs);
# 
#       UseProgram(prog);
#       self.prog = prog;
#     }
# 
#     gl! {
#       let mut vao = 0;
#       CreateVertexArrays(1, &mut vao);
#       BindVertexArray(vao);
#       self.vao = vao;
#     }
#   }
# 
#   fn render(&self, _current_time: f64) {
#     gl! {
#       ClearBufferfv(COLOR, 0, [0.0f32, 0.25, 0.0, 1.0].as_ptr());
#       DrawArrays(TRIANGLES, 0, 3);
#     }
#   }
# 
#   fn shutdown(&mut self) {
#     gl! {
#       DeleteProgram(self.prog);
#       DeleteTextures(1, &self.texture);  
#       DeleteVertexArrays(1, &self.vao);
#     }
#   }
# }
# 
# fn main() {
#   App::default().run();
# }
```

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

通过向每个顶点传递纹理坐标，可以将纹理环绕在物体周围。

纹理坐标一般使用建模软件手工分配，并存储在目标文件中。如果将一个简单的棋盘格图案加载到纹理中，并将其应用到模型上，效果如下:

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