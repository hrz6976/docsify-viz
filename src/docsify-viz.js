const plugin = (graphvizConf) => (hook) => {

  function showError(e, ele) {
    console.error(e);
    var message = e.message === undefined ? "An error occurred while processing the graph input." : e.message;
    while (ele.firstChild) {
      ele.removeChild(ele.firstChild);
    }
    // set color to red
    ele.style = graphvizConf.style || "align-items: center; display: flex; justify-content: center;";
    ele.style.color = "red";
    ele.appendChild(document.createTextNode(`[GraphViz] ${message}`));
  }

  async function fetchResource(url) {
    return new Promise((resolve, reject) => {
      fetch(url).then((response) => {
        if (response.ok) {
          response.text().then((data) => {
            resolve(data);
          });
        } else {
          reject(response.statusText);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  }

  function debounce(ms, fn) {
    let timer;
    return function() {
      clearTimeout(timer);
      let args = Array.prototype.slice.call(arguments);
      args.unshift(this);
      timer = setTimeout(fn.bind.apply(fn, args), ms);
    };
  };

  function observeResize(ele, callback) {
    let resizeObserver = new ResizeObserver(debounce(100, function(entries) {
      for (let entry of entries) {
        callback(entry);
      }
    }));
    resizeObserver.observe(ele);
    return resizeObserver;
  }

  async function renderGraph(viz, ele) {
    return new Promise((resolve, reject) => {
      try {
        let result = null;
        result = viz.renderSVGElement(ele.getAttribute('data-viz'), {
          format: 'svg',
          engine: graphvizConf.engine || 'dot',
        });
        result.style = graphvizConf.svgStyle || "min-height: 80px; max-height: 70vh; max-width: 100%;";
        if (result.status !== undefined && result.status != "success") {
          showError(result.errors && result.errors.length > 0 && result.errors[0] || result, ele);
        } else {
          var a = document.createElement("a");
          a.appendChild(result);
          while (ele.firstChild) ele.removeChild(ele.firstChild);
          ele.appendChild(a);
          svgPanZoom(result, graphvizConf.svgPanZoomOptions || {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: true,
            center: true,
          });
          ele.style = graphvizConf.style || "align-items: center; display: flex; justify-content: center;";
        }
      } catch (err) {
        showError(err, ele);
      } finally {
        ele.classList.remove("disabled");
      }
      resolve();
    });
  }

  hook.afterEach((html, next) => {
      // We load the HTML inside a DOM node to allow for manipulation
      const htmlElement = document.createElement('div');
      htmlElement.innerHTML = html;

      htmlElement.querySelectorAll('pre[data-lang=graphviz]').forEach((element) => {
          // Create a <div class="graphviz"> to replace the <pre> 
          const replacement = document.createElement('div');
          replacement.dataset.viz = element.textContent;
          replacement.classList.add(graphvizConf.className);

          // Replace
          element.parentNode.replaceChild(replacement, element);
      });

      // select img where src=*.dot
      htmlElement.querySelectorAll('img[src$=".dot"]').forEach((element) => {
          const replacement = document.createElement('div');
          replacement.dataset.src = element.getAttribute('src');
          replacement.classList.add(graphvizConf.className);

          // Replace
          element.parentNode.replaceChild(replacement, element);
      });

      next(htmlElement.innerHTML);
  });

  hook.doneEach(() => {
    Viz.instance().then(function (viz) {
      document.querySelectorAll("." + graphvizConf.className).forEach((ele) => {
        if (ele.dataset.viz) {
          renderGraph(viz, ele)
          // register event listener: on size change
          observeResize(ele, () => renderGraph(viz, ele));
        } else if (ele.dataset.src) {
          fetchResource(ele.dataset.src).then((content) => {
            ele.dataset.viz = content;
            renderGraph(viz, ele);
            // register event listener: on size change
            observeResize(ele, () => renderGraph(viz, ele));
          }).catch((err) => {
            showError(err, ele);
          });
        }
    });
    }).catch((err) => {
      console.error(err);
    });
  })
};

if (!window.$docsify) {
  window.$docsify = {}
}

const props = window.$docsify.graphvizConfig || { className: 'graphviz' };

window.$docsify.plugins = (window.$docsify.plugins || []).concat(plugin(props));