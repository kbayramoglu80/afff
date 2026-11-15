(function (global) {
  const editableAttributes = ["alt", "aria-label", "placeholder", "title", "href"];
  let savedContent = null;
  let savedLanguage = "tr";
  let pageCatalog = null;

  function getElementPath(element, root) {
    const segments = [];
    for (let current = element; current && current !== root; current = current.parentElement) {
      const tag = current.tagName.toLowerCase();
      if (current.id) {
        segments.unshift(`${tag}#${current.id}`);
      } else {
        const siblings = [...current.parentElement.children].filter(sibling => sibling.tagName === current.tagName);
        segments.unshift(`${tag}[${siblings.indexOf(current) + 1}]`);
      }
    }
    return segments.join("/");
  }

  function encodeKey(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return `c-${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }

  function getPageNamespace() {
    const match = global.location.pathname.match(/^\/tedavi\/([^/]+)\.html$/);
    return match ? `tedavi/${match[1]}` : "";
  }

  function getContentKey(namespace, value) {
    return encodeKey(namespace ? `${namespace}:${value}` : value);
  }

  function getGroup(element, doc) {
    const section = element.closest("section, header, footer, nav");
    if (!section) return { key: "page", label: "Sayfa ve gezinme" };
    const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
    const eyebrow = section.querySelector(".eyebrow");
    const fallbackLabel = section.tagName === "FOOTER" ? "Alt bilgi" : section.getAttribute("aria-label") || eyebrow?.textContent || section.id || section.tagName;
    const label = (heading?.textContent || fallbackLabel)
      .replace(/\s+/g, " ")
      .trim();
    return { key: getElementPath(section, doc.body) || section.tagName.toLowerCase(), label };
  }

  function isIgnored(element) {
    return Boolean(element.closest("script, style, noscript, svg, [data-cms-ignore], [aria-live], .faq-list"));
  }

  function collect(doc, namespace = getPageNamespace()) {
    const fields = [];
    const images = [];
    const walker = doc.createTreeWalker(doc.body, global.NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const element = node.parentElement;
      const value = node.nodeValue.trim();
      if (isIgnored(element)) continue;
      let textIndex = 0;
      for (const sibling of element.childNodes) {
        if (sibling === node) break;
        if (sibling.nodeType === global.Node.TEXT_NODE) textIndex += 1;
      }
      if (!value) continue;
      const group = getGroup(element, doc);
      fields.push({
        key: getContentKey(namespace, `text:${getElementPath(element, doc.body)}:${textIndex}`),
        type: "text",
        attribute: null,
        valueTr: value,
        label: `${element.tagName.toLowerCase()} · ${value.slice(0, 100)}`,
        groupKey: group.key,
        groupLabel: group.label,
        textIndex,
        parent: element,
        target: node,
      });
    }

    doc.body.querySelectorAll("*").forEach(element => {
      if (isIgnored(element)) return;
      const group = getGroup(element, doc);
      const path = getElementPath(element, doc.body);
      editableAttributes.forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const value = element.getAttribute(attribute);
        fields.push({
          key: getContentKey(namespace, `attribute:${path}:${attribute}`),
          type: "attribute",
          attribute,
          valueTr: value,
          label: `${element.tagName.toLowerCase()} · ${attribute} · ${(element.textContent || value).trim().slice(0, 100)}`,
          groupKey: group.key,
          groupLabel: group.label,
          target: element,
        });
      });
      if (element.tagName === "IMG" && element.hasAttribute("src")) {
        images.push({
          key: getContentKey(namespace, `image:${path}`),
          src: element.getAttribute("src"),
          label: `img · ${(element.getAttribute("alt") || element.getAttribute("src") || "Görsel").slice(0, 100)}`,
          groupKey: group.key,
          groupLabel: group.label,
          target: element,
        });
      }
    });

    return { fields, images };
  }

  function apply(doc, content, language) {
    const { fields, images } = pageCatalog;
    const entries = content.entries || {};
    for (const field of fields) {
      const entry = entries[field.key];
      let value = entry?.[language];
      if (language === "en" && value === "" && entry.valueTr !== field.valueTr) value = entry.valueTr;
      if (value === undefined || value === null || (language === "en" && value === "")) continue;
      if (field.type === "text") {
        const parent = field.parent || field.target?.parentElement;
        if (!parent) continue;
        const textNodes = [...parent.childNodes].filter(node => node.nodeType === global.Node.TEXT_NODE);
        const target = textNodes[field.textIndex] || field.target;
        if (!target || target.nodeValue === null) continue;
        const leading = target.nodeValue.match(/^\s*/)[0];
        const trailing = target.nodeValue.match(/\s*$/)[0];
        target.nodeValue = `${leading}${value}${trailing}`;
      } else field.target.setAttribute(field.attribute, value);
    }
    images.forEach(image => {
      const src = content.assets?.[image.key];
      if (src && image.target.getAttribute("src") !== src) image.target.src = src;
    });
  }

  function refresh(language = savedLanguage) {
    if (!savedContent) return;
    savedLanguage = language;
    apply(global.document, savedContent, savedLanguage);
  }

  function capture() {
    if (!pageCatalog) pageCatalog = collect(global.document);
  }

  async function load() {
    capture();
    const response = await global.fetch("/api/site-content", { cache: "no-store" });
    if (!response.ok) throw new Error("Site içerikleri yüklenemedi.");
    savedContent = await response.json();
    savedLanguage = global.document.documentElement.lang === "en" ? "en" : "tr";
    refresh();
  }

  global.SiteContent = { capture, collect, load, refresh };
  global.document.addEventListener("site-language-change", () => {
    savedLanguage = global.document.documentElement.lang === "en" ? "en" : "tr";
    refresh();
  });
})(window);
