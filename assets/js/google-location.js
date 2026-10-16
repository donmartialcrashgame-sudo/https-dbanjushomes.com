/* DBH Google Places helper. The Google API key remains server-side in Supabase. */
(function () {
  const ENDPOINT = "https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-google-location";
  const ANON_KEY = "sb_publishable_fbcJT-QGKyZg0tDkpbDkOQ_CcQf2ugW";
  const css = `
.dbh-place-wrap{position:relative;width:100%}.dbh-place-menu{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:9999;display:none;max-height:290px;overflow:auto;background:#fff;border:1px solid #d9e2ed;border-radius:12px;box-shadow:0 14px 35px rgba(6,43,82,.16);padding:5px}.dbh-place-menu.open{display:block}.dbh-place-option{display:block;width:100%;border:0;background:#fff;text-align:left;padding:11px 10px;border-radius:8px;cursor:pointer;color:#102033}.dbh-place-option:hover,.dbh-place-option:focus{background:#eff6ff;outline:0}.dbh-place-option strong{display:block;font-size:12px;font-weight:800}.dbh-place-option small{display:block;margin-top:3px;color:#64748b;font-size:10px;line-height:1.4}.dbh-place-status{font-size:10px;color:#64748b;margin-top:5px}.dbh-place-status.error{color:#b42318}.dbh-place-status.success{color:#16834b}
`;
  if (!document.getElementById("dbh-place-css")) {
    const style = document.createElement("style"); style.id = "dbh-place-css"; style.textContent = css; document.head.appendChild(style);
  }
  async function request(body) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Google location search is unavailable.");
    return data;
  }
  function attach(options) {
    const input = typeof options.input === "string" ? document.querySelector(options.input) : options.input;
    if (!input || input.dataset.dbhPlacesAttached === "1") return;
    input.dataset.dbhPlacesAttached = "1";
    const wrap = document.createElement("div"); wrap.className = "dbh-place-wrap";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    const menu = document.createElement("div"); menu.className = "dbh-place-menu"; menu.setAttribute("role", "listbox"); wrap.appendChild(menu);
    const status = document.createElement("div"); status.className = "dbh-place-status"; wrap.insertAdjacentElement("afterend", status);
    let timer = 0, sequence = 0, selected = false;
    const fields = options.fields || {};
    const getEl = key => {
      const selector = fields[key];
      return selector ? (selector.startsWith("#") || selector.startsWith(".") ? document.querySelector(selector) : document.getElementById(selector)) : null;
    };
    function setField(key, value) { const el = getEl(key); if (el && value != null) { el.value = value; el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); } }
    function clearSelection() {
      selected = false;
      ["placeId","country","countryCode","latitude","longitude"].forEach(k => { const el = getEl(k); if (el) el.value = ""; });
      status.textContent = ""; status.className = "dbh-place-status";
    }
    function close() { menu.classList.remove("open"); menu.replaceChildren(); }
    function showError(message) { status.textContent = message; status.className = "dbh-place-status error"; }
    input.addEventListener("input", () => {
      clearSelection();
      window.clearTimeout(timer);
      const q = input.value.trim(), seq = ++sequence;
      if (q.length < 2) { close(); return; }
      timer = window.setTimeout(async () => {
        try {
          const data = await request({action:"autocomplete", input:q});
          if (seq !== sequence || input.value.trim() !== q) return;
          menu.replaceChildren();
          (data.suggestions || []).forEach(item => {
            const button = document.createElement("button"); button.type = "button"; button.className = "dbh-place-option"; button.setAttribute("role","option");
            const main = document.createElement("strong"); main.textContent = item.mainText || item.description;
            const sub = document.createElement("small"); sub.textContent = item.secondaryText || "";
            button.append(main, sub);
            button.addEventListener("click", async () => {
              close(); status.textContent = "Loading selected address…"; status.className = "dbh-place-status";
              try {
                const place = await request({action:"details", placeId:item.placeId});
                input.value = place.address || item.description || "";
                setField("state", place.state); setField("lga", place.lga); setField("city", place.city);
                setField("area", place.area); setField("country", place.country); setField("countryCode", place.country_code);
                setField("placeId", place.placeId); setField("latitude", place.latitude); setField("longitude", place.longitude);
                selected = true;
                status.textContent = "Address selected from Google Maps.";
                status.className = "dbh-place-status success";
                input.dispatchEvent(new Event("change", {bubbles:true}));
                if (typeof options.onSelect === "function") options.onSelect(place);
              } catch (error) { showError(error.message || "Could not load this address."); }
            });
            menu.appendChild(button);
          });
          if (menu.childElementCount) menu.classList.add("open");
          else close();
        } catch (error) {
          if (seq === sequence) { close(); showError(error.message || "Location search failed."); }
        }
      }, 280);
    });
    document.addEventListener("click", event => { if (!wrap.contains(event.target)) close(); });
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowDown" && menu.childElementCount) { event.preventDefault(); menu.querySelector("button")?.focus(); }
    });
    return { get selected() { return selected; }, clearSelection };
  }
  window.DBHGoogleLocation = { attach };
})();