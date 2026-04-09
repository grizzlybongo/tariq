// Note: this requires a local HTTP server (fetch won't load local files from file://).
async function loadComponent(host, path) {
  if (!host || !path) return;

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Impossible de charger ${path} (${response.status})`);
    }

    const html = await response.text();
    host.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

async function loadAllComponents() {
  const hosts = Array.from(document.querySelectorAll("[data-component]"));

  await Promise.all(hosts.map((host) => loadComponent(host, host.getAttribute("data-component"))));
}

window.loadAllComponents = loadAllComponents;
