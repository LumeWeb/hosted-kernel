import { boot } from "./kernel.js";

document.title = "Hosted Lume Kernel";
let header = document.createElement("h1");
header.textContent =
  "Something went wrong! You should not be visiting this page, this page should only be accessed via an invisible iframe.";
document.body.appendChild(header);

boot();
