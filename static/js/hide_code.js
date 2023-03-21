window.addEventListener('load', function () {
  'use strict';
  const langs = ['rust', 'glsl'].map(l => '.hljs' + `.language-${l}`).join(',');

  const codeBlocks = document.querySelectorAll(langs);

  // build the lines to hide
  // .switch-btn has been mounted

  // Store element to hide for every code block
  const lines_to_hide = []

  for (let i = 0; i < codeBlocks.length; i++) {
    const id = "switch-codeblk-" + i;
    codeBlocks[i].id = id;

    const table = codeBlocks[i].querySelector('table')
    const gutters = table.querySelectorAll(".hljs-ln-numbers")
    const codes = table.querySelectorAll(".hljs-ln-code");

    const elem_to_hide = [];

    for (let j = 0; j < codes.length; j++) {
      if (codes[j].firstChild && codes[j].firstChild.textContent.startsWith("# ")) {
        const lineObj = {}
        // push lines to hide into array
        codes[j].firstChild.textContent = codes[j].firstChild.textContent.replace("# ", "");
        codes[j].classList.add('boring')
        lineObj.code = codes[j];
        if (gutters[j] !== undefined) {
          lineObj.line = gutters[j];
          gutters[j].classList.add('boring')
        }

        elem_to_hide.push(lineObj)
      }
    }

    // Delete the switch button if there is no need to hide code
    if (elem_to_hide.length > 0) {
      // switch-code HTML
      const switch_btn =
        `<span id="${id}" class="switch-btn" aria-label="expand">`
        + '/ Expand Code'
        + '</span>';

      // mount the switch btn
      codeBlocks[i].insertAdjacentHTML('beforebegin', switch_btn);

      // add index
      lines_to_hide[id] = elem_to_hide;

      // Hide the lines
      elem_to_hide.forEach(function (t) {
        if (t.line) t.line.style.display = 'none';
        if (t.code) t.code.style.display = 'none';
      });
    }
  }

  // handle click event

  for (let id in lines_to_hide) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', function () {
      if (btn.textContent.indexOf('Fold') != -1) {
        // hide lines
        lines_to_hide[id].forEach(function (t) {
          if (t.line) t.line.style.display = 'none';
          if (t.code) t.code.style.display = 'none';
        });
        btn.textContent = '/ Expand Code'
      } else {
        // show lines
        lines_to_hide[id].forEach(function (t) {
          if (t.code) t.code.style.display = null
          if (t.line) t.line.style.display = null;
        });
        btn.textContent = '/ Fold Code'
      }
    })
  }
})
