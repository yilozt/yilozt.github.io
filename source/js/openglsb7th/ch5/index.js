import init, * as app from "./sb7.js";

const run = async () => {
    await init();

    const demos = document.getElementsByClassName('demo_app');
    for (let i = 0; i < demos.length; i++) {
        const demo = demos.item(i);
        const id = demo.id;

        demo.innerHTML = `
        <canvas id="canvas" width="700" height="320"></canvas>  
        <details open="">
          <summary id="title" class="apptitle">Hello, Rust! (Loading.....)</summary>
          <div id="ui"></div>
        </details>
        `;

        ScrollReveal().reveal("#" + id, {
            reset: true,
            opacity: 1.0,
            afterReveal: () => app[id].run(700, 320, id),
            afterReset: () => app[id].stop(id),
        });
    }
    console.log("done~");
}

run();