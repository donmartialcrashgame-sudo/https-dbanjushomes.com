/* DBH location picker. The location service key stays on the server. */
(function () {
  const ENDPOINT = "https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-google-location";
  const ANON_KEY = "sb_publishable_fbcJT-QGKyZg0tDkpbDkOQ_CcQf2ugW";
  const css = `
.dbh-place-wrap{position:relative;width:100%}
.dbh-place-menu{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:9999;display:none;max-height:320px;overflow:auto;background:#fff;border:1px solid #d9e2ed;border-radius:12px;box-shadow:0 14px 35px rgba(6,43,82,.16);padding:6px}
.dbh-place-menu.open{display:block}
.dbh-place-option{display:block;width:100%;border:0;background:#fff;text-align:left;padding:11px 10px;border-radius:8px;cursor:pointer;color:#102033}
.dbh-place-option:hover,.dbh-place-option:focus{background:#eff6ff;outline:0}
.dbh-place-option strong{display:block;font-size:12px;font-weight:800}
.dbh-place-option small{display:block;margin-top:3px;color:#64748b;font-size:10px;line-height:1.4}
.dbh-place-prompt{padding:9px 10px;color:#64748b;font-size:11px;line-height:1.45}
.dbh-place-nearby{display:block;width:100%;padding:10px;margin:3px 0 5px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#124b91;font-weight:750;font-size:11px;text-align:left;cursor:pointer}
.dbh-place-nearby:disabled{opacity:.65;cursor:wait}
.dbh-place-status{font-size:10px;color:#64748b;margin-top:5px}
.dbh-place-status.error{color:#b42318}.dbh-place-status.success{color:#16834b}
`;
  if (!document.getElementById("dbh-place-css")) {
    const style = document.createElement("style");
    style.id = "dbh-place-css"; style.textContent = css; document.head.appendChild(style);
  }
  async function request(body) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Location search is unavailable.");
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
    let timer = 0, sequence = 0, selected = false, nearbyCoords = null;
    const fields = options.fields || {};
    const getEl = key => {
      const selector = fields[key];
      return selector ? (selector.startsWith("#") || selector.startsWith(".") ? document.querySelector(selector) : document.getElementById(selector)) : null;
    };
    function setField(key, value) {
      const el = getEl(key);
      if (el) { el.value = value == null ? "" : value; el.dispatchEvent(new Event("change", {bubbles:true})); }
    }
    function clearSelection() {
      selected = false;
      if (options.authoritative === true) {
        ["placeId","latitude","longitude","countryCode","state","lga","city","area","country"].forEach(k => {
          const el = getEl(k); if (el && el !== input) el.value = "";
        });
      } else {
        ["placeId","latitude","longitude"].forEach(k => { const el = getEl(k); if (el) el.value = ""; });
      }
      status.textContent = ""; status.className = "dbh-place-status";
    }
    function close() { menu.classList.remove("open"); menu.replaceChildren(); }
    function showError(message) { status.textContent = message; status.className = "dbh-place-status error"; }
    function promptMenu() {
      menu.replaceChildren();
      const prompt = document.createElement("div");
      prompt.className = "dbh-place-prompt";
      prompt.textContent = "Type to search anywhere in the world, or use your current location for nearby suggestions.";
      const nearby = document.createElement("button");
      nearby.type = "button"; nearby.className = "dbh-place-nearby";
      nearby.textContent = "⌖  Suggest places near my current location";
      nearby.addEventListener("click", loadNearby);
      menu.append(prompt, nearby); menu.classList.add("open");
    }
    function renderSuggestions(items, seq) {
      menu.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div"); empty.className = "dbh-place-prompt";
        empty.textContent = "No matching locations found. Try another search.";
        menu.appendChild(empty);
        const nearby = document.createElement("button"); nearby.type = "button"; nearby.className = "dbh-place-nearby";
        nearby.textContent = "⌖  Suggest places near my current location"; nearby.addEventListener("click", loadNearby);
        menu.appendChild(nearby); menu.classList.add("open"); return;
      }
      items.forEach(item => {
        const button = document.createElement("button"); button.type = "button"; button.className = "dbh-place-option"; button.setAttribute("role","option");
        const main = document.createElement("strong"); main.textContent = item.mainText || item.description || "Location";
        const sub = document.createElement("small"); sub.textContent = item.secondaryText || "";
        button.append(main, sub);
        button.addEventListener("click", async () => {
          ++sequence; close(); status.textContent = "Loading selected location…"; status.className = "dbh-place-status";
          try {
            const place = await request({action:"details", placeId:item.placeId});
            const primaryValue = options.primaryField ? place[options.primaryField] : place.address;
            input.value = primaryValue || place.address || item.description || "";
            setField("state", place.state); setField("lga", place.lga); setField("city", place.city);
            setField("area", place.area); setField("country", place.country);
            const addressEl = getEl("address");
            if (addressEl && addressEl !== input) setField("address", place.address);
            setField("countryCode", place.country_code);
            if (options.authoritative === true) {
              setField("placeId", place.placeId); setField("latitude", place.latitude); setField("longitude", place.longitude);
            } else {
              setField("placeId", ""); setField("latitude", ""); setField("longitude", "");
            }
            selected = true;
            status.textContent = "Location details filled successfully.";
            status.className = "dbh-place-status success";
            input.dispatchEvent(new Event("change", {bubbles:true}));
            if (typeof options.onSelect === "function") options.onSelect(place);
          } catch (error) { showError(error.message || "Could not load this location."); }
        });
        menu.appendChild(button);
      });
      const nearby = document.createElement("button"); nearby.type = "button"; nearby.className = "dbh-place-nearby";
      nearby.textContent = "⌖  Show places near my current location"; nearby.addEventListener("click", loadNearby);
      menu.appendChild(nearby); menu.classList.add("open");
    }
    async function loadNearby(event) {
      if (event) event.preventDefault();
      const button = menu.querySelector(".dbh-place-nearby");
      if (button) { button.disabled = true; button.textContent = "Finding nearby places…"; }
      status.textContent = "Requesting location permission…"; status.className = "dbh-place-status";
      if (!navigator.geolocation) { showError("This browser cannot provide your current location. You can still search by typing."); promptMenu(); return; }
      navigator.geolocation.getCurrentPosition(async position => {
        nearbyCoords = {latitude:position.coords.latitude,longitude:position.coords.longitude};
        const seq = ++sequence, field = options.primaryField || (input.id === "state" ? "state" : input.id === "lga" ? "lga" : input.id === "city" ? "city" : input.id === "area" ? "area" : input.id === "country" ? "country" : "address");
        status.textContent = "Loading nearby suggestions…"; status.className = "dbh-place-status";
        try {
          const data = await request({action:"nearby", ...nearbyCoords, field});
          if (seq !== sequence) return;
          renderSuggestions(data.suggestions || [], seq);
          status.textContent = (data.suggestions || []).length ? "Nearby suggestions are ready. You can also type to search worldwide." : "No nearby suggestions found. Type to search worldwide.";
          status.className = "dbh-place-status";
        } catch (error) { promptMenu(); showError(error.message || "Nearby suggestions are unavailable. You can still search by typing."); }
      }, error => {
        promptMenu();
        showError(error.code === 1 ? "Location permission was not granted. You can still search anywhere by typing." : "Current location is unavailable. You can still search anywhere by typing.");
      }, {enableHighAccuracy:false, timeout:10000, maximumAge:300000});
    }
    input.addEventListener("focus", () => {
      if (!input.value.trim()) promptMenu();
      else if (!menu.childElementCount) promptMenu();
    });
    input.addEventListener("input", () => {
      clearSelection();
      window.clearTimeout(timer);
      const q = input.value.trim(), seq = ++sequence;
      if (q.length < 2) { promptMenu(); return; }
      timer = window.setTimeout(async () => {
        try {
          const payload = {action:"autocomplete", input:q};
          if (nearbyCoords) payload.locationBias = nearbyCoords;
          const data = await request(payload);
          if (seq !== sequence || input.value.trim() !== q) return;
          renderSuggestions(data.suggestions || [], seq);
        } catch (error) {
          if (seq === sequence) { promptMenu(); showError(error.message || "Location search failed."); }
        }
      }, 250);
    });
    document.addEventListener("click", event => { if (!wrap.contains(event.target)) close(); });
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowDown" && menu.querySelector("button")) { event.preventDefault(); menu.querySelector("button").focus(); }
    });
    return { get selected() { return selected; }, clearSelection };
  }
  window.DBHGoogleLocation = { attach };
})();