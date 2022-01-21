---
title: Rust code hide Test
date: 2022-01-21 21:17:59
tags: test
---

Add `# ` at start of line to hiding with rust code block: 

```
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

it will render to:

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

You can click eye-btn to expand / fold the code. copy-btn will copy all code into clipboard.