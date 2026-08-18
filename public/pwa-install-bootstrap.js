(function () {
  if (window.location.protocol === "file:") {
    return;
  }

  window.__deferredPwaInstallPrompt = null;
  window.__pwaSwRegistrationError = null;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__deferredPwaInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("pwa-installprompt"));
  });

  window.addEventListener("appinstalled", function () {
    window.__deferredPwaInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
})();
