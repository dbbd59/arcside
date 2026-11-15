import type { RuntimeMessage } from "./lib/messages";

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.type !== "copy-to-clipboard") return;
  const field = document.createElement("textarea");
  field.value = message.text;
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
});
