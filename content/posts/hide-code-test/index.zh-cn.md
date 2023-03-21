---
title: Rust Code Hide Testing
date: 2022-01-21 21:17:59
tags: test
summary: Just A Test
---

在 Rust 代码块的行首添加 `#` 号: 

```txt
# use std::ffi::c_void;
# 
# use sb7::application::Application;
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      let mut buf = 0;
      let mut data = Vec::from("hello world");
      data.resize(1024 * 1024, 0);

      gl::CreateBuffers(1, &mut buf);
      {
        let data = data.as_ptr() as *const c_void;
        gl::NamedBufferStorage(buf, 1024 * 1024, data, gl::DYNAMIC_STORAGE_BIT);
      }
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

渲染结果:

```rust
# use std::ffi::c_void;
# 
# use sb7::application::Application;
# struct App;
# 
# impl Application for App {
#   fn startup(&mut self) {
#     unsafe {
      let mut buf = 0;
      let mut data = Vec::from("hello world");
      data.resize(1024 * 1024, 0);

      gl::CreateBuffers(1, &mut buf);
      {
        let data = data.as_ptr() as *const c_void;
        gl::NamedBufferStorage(buf, 1024 * 1024, data, gl::DYNAMIC_STORAGE_BIT);
      }
#     }
#   }
# }
# 
# fn main() {
#   App.run()
# }
```

可以显示 / 隐藏代码.