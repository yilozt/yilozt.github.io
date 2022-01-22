---
title: OpenGL超级宝典第七版学习笔记 (5)：数据
tags: OpenGL
categories: 学习笔记
---

- 如何创建 buffer 和 texture，用来存储数据
- 如何让 OpenGL 自动填充顶点属性
- 如何从 shader 访问 buffer 和 texture

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

## 内存映射

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
  let mut recv = [0; 4];
  
  gl::CreateBuffers(1, &mut buf);
  gl::NamedBufferStorage(buf,
                         size_of_val(&data) as isize,
                         data.as_ptr() as *const c_void,
                         gl::MAP_READ_BIT);

  let ptr = gl::MapNamedBufferRange(buf,
#                                     // 偏移量：2 * 4 字节（两个 i32 变量）
                                    2 * size_of::<i32>() as isize,
#                                     // 映射长度：4 * 4 字节（四个 i32 变量）
                                    size_of_val(&recv) as isize,
#                                     // 只用来读取数据
                                    gl::MAP_READ_BIT);
  copy(ptr as *const i32, recv.as_mut_ptr(), recv.len());
  gl::UnmapNamedBuffer(buf);

  assert_eq!(recv, [3, 4, 5, 6]);
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