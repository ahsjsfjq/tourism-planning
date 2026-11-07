/* ==================================================================
 * 多日旅游行程规划系统 - app.js
 * 功能：城市选择 / POI搜索推荐 / 智能行程规划(DP) /
 *       地图路线可视化 / 详情弹窗 / 行程导出 / 本地持久化
 * ================================================================== */

/* ==================== 城市数据库 ==================== */
var CITIES = [
  {name:"北京", en:"Beijing", ico:"🏛️", lng:116.404, lat:39.915, desc:"古都风貌 · 故宫长城"},
  {name:"上海", en:"Shanghai", ico:"🌃", lng:121.473, lat:31.230, desc:"魔都风采 · 外滩陆家嘴"},
  {name:"广州", en:"Guangzhou", ico:"🌺", lng:113.264, lat:23.129, desc:"美食之都 · 粤式早茶"},
  {name:"成都", en:"Chengdu", ico:"🐼", lng:104.066, lat:30.572, desc:"天府之国 · 火锅熊猫"},
  {name:"重庆", en:"Chongqing", ico:"🏔️", lng:106.551, lat:29.563, desc:"8D魔幻 · 洪崖洞火锅"},
  {name:"杭州", en:"Hangzhou", ico:"🌊", lng:120.155, lat:30.274, desc:"人间天堂 · 西湖龙井"},
  {name:"西安", en:"Xi'an", ico:"🏯", lng:108.940, lat:34.261, desc:"千年古都 · 兵马俑"},
  {name:"武汉", en:"Wuhan", ico:"🌸", lng:114.305, lat:30.593, desc:"江城之美 · 黄鹤楼"},
  {name:"长沙", en:"Changsha", ico:"🌶️", lng:112.979, lat:28.213, desc:"美食娱乐 · 橘子洲"},
  {name:"南京", en:"Nanjing", ico:"🏛️", lng:118.796, lat:32.060, desc:"六朝古都 · 夫子庙"},
  {name:"苏州", en:"Suzhou", ico:"🌿", lng:120.585, lat:31.299, desc:"园林之城 · 江南水乡"},
  {name:"厦门", en:"Xiamen", ico:"🏖️", lng:118.089, lat:24.480, desc:"海上花园 · 鼓浪屿"},
  {name:"青岛", en:"Qingdao", ico:"🌊", lng:120.382, lat:36.067, desc:"海滨明珠 · 啤酒海鲜"},
  {name:"大连", en:"Dalian", ico:"⛵", lng:121.614, lat:38.914, desc:"浪漫海滨 · 广场之城"},
  {name:"丽江", en:"Lijiang", ico:"🏔️", lng:100.229, lat:26.875, desc:"古城风韵 · 玉龙雪山"},
  {name:"大理", en:"Dali", ico:"🌅", lng:100.230, lat:25.592, desc:"风花雪月 · 苍山洱海"},
  {name:"三亚", en:"Sanya", ico:"🏝️", lng:109.511, lat:18.252, desc:"热带天堂 · 沙滩海景"},
  {name:"桂林", en:"Guilin", ico:"🏞️", lng:110.290, lat:25.273, desc:"山水甲天下 · 漓江"},
  {name:"昆明", en:"Kunming", ico:"🌸", lng:102.832, lat:24.880, desc:"春城花都 · 四季如春"},
  {name:"哈尔滨", en:"Harbin", ico:"❄️", lng:126.661, lat:45.742, desc:"冰雪之城 · 中央大街"},
  {name:"拉萨", en:"Lhasa", ico:"🙏", lng:91.117, lat:29.647, desc:"圣城拉萨 · 布达拉宫"},
  {name:"敦煌", en:"Dunhuang", ico:"🐪", lng:94.662, lat:40.142, desc:"丝路明珠 · 莫高窟"},
  {name:"深圳", en:"Shenzhen", ico:"🌴", lng:114.057, lat:22.543, desc:"创新之城 · 主题公园"}
];

/* ==================== 应用状态 ==================== */
var state = {
  map: null,
  markers: [],            /* 搜索结果标记 */
  selectedMarkers: [],    /* 已选地点标记 */
  routeLines: [],         /* 行程路线 Polyline */
  routeVisible: true,
  selected: [],
  results: [],
  itinerary: null,
  searchType: "all",
  mapReady: false,
  city: null,
  home: null,           /* 住址 {lng, lat, addr} */
  homeMarker: null,     /* 住址地图标记 */
  tempHomeMarker: null, /* 选点时的临时标记 */
  pickHomeMode: false   /* 是否处于住址选点模式 */
};

var DAY_COLORS = ["#1a73e8", "#e53935", "#f59e0b", "#34a853", "#8e24aa", "#00acc1", "#5d4037", "#546e7a"];
var STORAGE_KEY_CITY = "travel_plan_city";
var STORAGE_KEY_SELECTED = "travel_plan_selected";
var STORAGE_KEY_HOME = "travel_plan_home";

/* ==================== 和风天气 ==================== */
var WEATHER_KEY = "e08a9697f40f4ddbb302b3520bca1137";
var WEATHER_URL = "https://devapi.qweather.com/v7/weather/7d";

/* ==================== 工具函数 ==================== */
function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function calcDistance(lng1, lat1, lng2, lat2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeToMin(t) {
  var p = t.split(":");
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function minToTime(m) {
  var h = Math.floor(m / 60) % 24;
  var mn = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mn < 10 ? "0" : "") + mn;
}

function addTime(t, mins) {
  return minToTime(timeToMin(t) + Math.round(mins));
}

function showToast(msg) {
  var el = document.getElementById("toastEl");
  if (!el) {
    el = document.createElement("div");
    el.id = "toastEl";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  if (state._toastTimer) clearTimeout(state._toastTimer);
  state._toastTimer = setTimeout(function() {
    el.style.opacity = "0";
  }, 2500);
}

/* ==================== 天气（和风天气） ==================== */
function isRainyDay(w) {
  if (!w) return false;
  var t = (w.textDay || "") + (w.textNight || "");
  return /雨|雪|雷|雹|冰/.test(t);
}

function weatherIcon(w) {
  if (!w) return "";
  if (isRainyDay(w)) return "🌧️";
  var t = (w.textDay || "");
  if (/晴/.test(t)) return "☀️";
  if (/云/.test(t)) return "⛅";
  if (/阴/.test(t)) return "☁️";
  if (/雾/.test(t)) return "🌫️";
  return "🌡️";
}

function weatherDesc(w) {
  if (!w) return "";
  return weatherIcon(w) + " " + (w.textDay || "") + " " + (w.tempMin || "?") + "~" + (w.tempMax || "?") + "°C";
}

function fetchWeather(lng, lat, days, cb) {
  if (!lng || !lat) { cb(null); return; }
  try {
    fetch(WEATHER_URL + "?location=" + lng + "," + lat + "&key=" + WEATHER_KEY)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var list = [];
        if (d && d.code === "200" && d.daily) {
          for (var i = 0; i < Math.min(days, d.daily.length); i++) list.push(d.daily[i]);
        }
        cb(list.length ? list : null);
      })
      .catch(function() { cb(null); });
  } catch (e) { cb(null); }
}

/* ==================== 预算估算 ==================== */
function poiTagsText(p) {
  var s = (p.name || "") + " " + (p.addr || "");
  if (p.tags) {
    for (var i = 0; i < p.tags.length; i++) {
      var t = p.tags[i];
      s += " " + ((typeof t === "string") ? t : (t && t.name) || "");
    }
  }
  return s;
}

function estimatePoiCost(p) {
  if (!p) return {label: "", value: 0};
  if (p.type === "food") {
    var t = poiTagsText(p);
    var v = 45;
    if (/火锅|自助|日料|海鲜|西餐|烧烤/.test(t)) v = 110;
    else if (/咖啡|奶茶|甜品|面包|冰淇淋/.test(t)) v = 28;
    else if (/小吃|快餐|面馆|煎饼/.test(t)) v = 30;
    return {label: "🍜 人均 ¥" + v, value: v};
  }
  var t = poiTagsText(p);
  var v = 40;
  if (/博物馆|美术馆|展览|纪念馆/.test(t)) v = 35;
  else if (/主题乐园|欢乐谷|迪士尼|动物园|海洋馆/.test(t)) v = 180;
  else if (/公园|广场|街区|湿地|森林/.test(t)) v = 15;
  else if (/古镇|寺庙|老街|步行街/.test(t)) v = 25;
  else if (/夜景|观景台/.test(t)) v = 30;
  return {label: "🎫 门票 ¥" + v, value: v};
}

function estimateTransportCost(min, mode) {
  if (mode === "walking" || mode === "cycling") return 0;
  if (mode === "transit") return 3;
  if (mode === "taxi") return Math.round(min * 1.2);
  if (mode === "driving") return Math.round(min * 0.8);
  return 2;
}

function estimateBudget(it) {
  var food = 0, ticket = 0, traffic = 0;
  if (!it || !it.days) return {food: 0, ticket: 0, traffic: 0, total: 0};
  for (var d = 0; d < it.days.length; d++) {
    var day = it.days[d];
    for (var s = 0; s < day.steps.length; s++) {
      var st = day.steps[s];
      if (st.type === "food") { food += estimatePoiCost(st.place).value; }
      else if (st.type === "attr") { ticket += estimatePoiCost(st.place).value; }
      else if (st.type === "transit" && st.mode && st.detail) {
        var m = st.detail.match(/约(\d+)分钟/);
        if (m) traffic += estimateTransportCost(parseInt(m[1], 10), st.mode);
      }
    }
  }
  return {food: food, ticket: ticket, traffic: traffic, total: food + ticket + traffic};
}

/* ==================== 本地持久化 ==================== */
function saveState() {
  try {
    if (state.city) localStorage.setItem(STORAGE_KEY_CITY, JSON.stringify(state.city));
    else localStorage.removeItem(STORAGE_KEY_CITY);
    localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(state.selected));
    if (state.home) localStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(state.home));
    else localStorage.removeItem(STORAGE_KEY_HOME);
  } catch (e) {}
}

function loadState() {
  try {
    var c = localStorage.getItem(STORAGE_KEY_CITY);
    if (c) state.city = JSON.parse(c);
    var s = localStorage.getItem(STORAGE_KEY_SELECTED);
    if (s) state.selected = JSON.parse(s) || [];
    var h = localStorage.getItem(STORAGE_KEY_HOME);
    if (h) state.home = JSON.parse(h) || null;
  } catch (e) {}
}

/* ==================== 城市选择 ==================== */
function initCities() {
  var grid = document.getElementById("cityGrid");
  var html = "";
  for (var i = 0; i < CITIES.length; i++) {
    var c = CITIES[i];
    html += '<div class="city-card" onclick="selectCity(\'' + c.name + '\')">' +
      '<div class="cicon">' + c.ico + '</div>' +
      '<div class="cname">' + c.name + '</div>' +
      '<div class="cen">' + c.en + '</div>' +
      '<div class="cdesc">' + c.desc + '</div>' +
      '</div>';
  }
  grid.innerHTML = html;
}

function showCitySelect() {
  document.getElementById("cityOverlay").style.display = "flex";
}

function hideCitySelect() {
  document.getElementById("cityOverlay").style.display = "none";
}

function refreshCityBar() {
  var c = state.city;
  if (!c) return;
  document.getElementById("cityBarText").innerHTML = "📍 " + c.name;
  document.getElementById("cityBarSub").innerHTML = "⭐ 热门景点 · 🍜 美食推荐已就绪 [点击切换]";
  document.getElementById("cityRecName").textContent = c.name;
}

function selectCity(name) {
  var c = null;
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].name === name) { c = CITIES[i]; break; }
  }
  if (!c) return;
  applyCitySelection(c);
}

function selectCustomCity(name, lng, lat) {
  applyCitySelection({
    name: name, en: "", ico: "📍",
    lng: lng, lat: lat, desc: "自定义城市", custom: true
  });
}

function applyCitySelection(c) {
  state.city = c;
  hideCitySelect();
  refreshCityBar();
  saveState();
  if (state.mapReady) {
    var pt = new BMap.Point(c.lng, c.lat);
    state.map.centerAndZoom(pt, 13);
    clearAllMarkers();
    clearRoutes();
    state.selected = [];
    state.results = [];
    state.itinerary = null;
    /* 住址距离新城市太远则清除，防止跨城住址 */
    if (state.home && state.home.lng && state.home.lat) {
      if (calcDistance(state.home.lng, state.home.lat, c.lng, c.lat) > 100000) {
        removeHome(true);
      }
    }
    document.getElementById("exportBtn").style.display = "none";
    updateAllUI();
    setTimeout(function() { loadRecommended(); }, 400);
  } else {
    showToast("地图正在加载中，请稍后");
  }
}

/* 任意城市搜索（百度地理编码） */
function searchCity() {
  var input = document.getElementById("citySearchInput");
  var keyword = input.value.trim();
  if (!keyword) { showToast("请输入城市名称"); return; }

  var resultsDiv = document.getElementById("citySearchResults");
  resultsDiv.innerHTML = '<div class="city-search-status">🔍 正在搜索 "' + keyword + '"...</div>';

  try {
    var gc = new BMap.Geocoder();
    var trySelect = function(name, lng, lat) {
      resultsDiv.innerHTML =
        '<div class="city-search-item" onclick="selectCustomCity(\'' + name.replace(/'/g, "\\'") + '\',' + lng + ',' + lat + ')">' +
          '<span class="csi-icon">📍</span>' +
          '<span class="csi-name">' + name + '</span>' +
          '<span class="csi-action">选择此城市 →</span>' +
        '</div>';
    };
    gc.getPoint(keyword, function(pt) {
      if (pt) { trySelect(keyword, pt.lng, pt.lat); }
      else {
        gc.getPoint(keyword + "市", function(pt2) {
          if (pt2) { trySelect(keyword, pt2.lng, pt2.lat); }
          else {
            resultsDiv.innerHTML = '<div class="city-search-status">未找到 "' + keyword + '"，请尝试其他名称</div>';
          }
        }, keyword);
      }
    }, keyword);
  } catch (e) {
    document.getElementById("citySearchResults").innerHTML = '<div class="city-search-status">搜索出错，请稍后重试</div>';
  }
}

/* ==================== 地图初始化 ==================== */
window._mapInit = function() {
  if (state.mapReady) return;
  document.getElementById("mapLoading").style.display = "none";
  try {
    var c = new BMap.Point(116.404, 39.915);
    state.map = new BMap.Map("mapContainer");
    state.map.centerAndZoom(c, 5);
    state.map.enableScrollWheelZoom();
    state.map.addControl(new BMap.NavigationControl({anchor: BMAP_ANCHOR_TOP_LEFT}));
    state.map.addControl(new BMap.ScaleControl());
    state.map.addControl(new BMap.MapTypeControl({
      mapTypes: [BMAP_NORMAL_MAP, BMAP_SATELLITE_MAP],
      anchor: BMAP_ANCHOR_TOP_RIGHT
    }));
    state.mapReady = true;

    /* 住址选点：仅选点模式下响应地图空白处点击 */
    state.map.addEventListener("click", function(e) {
      if (state.pickHomeMode && e.overlay === null) {
        pickHomeAt(e.point);
      }
    });

    document.getElementById("mapToolbar").style.display = "flex";

    if (state.city) {
      state.map.centerAndZoom(new BMap.Point(state.city.lng, state.city.lat), 13);
      setTimeout(function() {
        loadRecommended();
        if (state.selected.length > 0) updateSelectedMarkers();
        /* 恢复已保存的住址标记 */
        if (state.home && state.home.lng && state.home.lat) {
          placeHomeMarker(state.home.lng, state.home.lat, state.home.addr || "");
        }
      }, 400);
    }
  } catch (e) {
    var el = document.getElementById("mapLoading");
    el.innerHTML = '<div style="color:#e53935;font-weight:600;">地图初始化失败</div><div style="font-size:12px;color:#999;margin-top:8px;">' + e.message + '</div>';
    el.style.display = "block";
  }
};

/* 超时提示：15 秒内地图未就绪 */
setTimeout(function() {
  if (!state.mapReady) {
    var el = document.getElementById("mapLoading");
    if (el) {
      el.innerHTML = '<div style="color:#e53935;font-weight:600;">⏰ 百度地图加载超时</div>' +
        '<div style="font-size:12px;color:#999;margin-top:10px;line-height:1.6;">' +
        '可能原因:<br>' +
        '① 网络无法访问 api.map.baidu.com<br>' +
        '② API密钥未生效或域名未授权<br>' +
        '③ 需要在百度地图控制台添加域名白名单</div>';
    }
  }
}, 15000);

/* ==================== 搜索 / 推荐 ==================== */
function classifyPOI(poi, defaultType) {
  var name = poi.title || "";
  var foodKw = ["餐厅","饭馆","火锅","烧烤","料理","小吃","美食","食堂","咖啡","奶茶","快餐","甜品","蛋糕","面包","饺子","面条","炒菜","烤鱼","小龙虾","酒楼","茶楼","饭团","米粉","烧腊"];
  var scenicKw = ["公园","景区","博物馆","纪念馆","故居","寺","庙","山","湖","塔","宫","陵","园","古镇","古街","遗址","瀑布","峰","峡","洞","岛","沙滩","海滩","自然保护区","动物园","植物园","游乐园","城墙","古城","古建筑","名胜","风景"];
  for (var i = 0; i < foodKw.length; i++) {
    if (name.indexOf(foodKw[i]) >= 0) return "food";
  }
  for (var i = 0; i < scenicKw.length; i++) {
    if (name.indexOf(scenicKw[i]) >= 0) return "scenic";
  }
  return defaultType;
}

function loadRecommended() {
  if (!state.city) { showToast("请先选择城市"); showCitySelect(); return; }
  if (!state.mapReady) { showToast("地图未就绪，请稍候"); return; }

  var rd = document.getElementById("resultsDiv");
  rd.innerHTML = '<div class="empty">⏳ 正在搜索景点和美食...</div>';
  state.results = [];
  var seen = {};
  var city = state.city;

  var queries = [
    {q: city.name + " 旅游景点", type: "scenic"},
    {q: city.name + " 公园", type: "scenic"},
    {q: city.name + " 博物馆", type: "scenic"},
    {q: city.name + " 美食", type: "food"},
    {q: city.name + " 餐厅", type: "food"},
    {q: city.name + " 小吃", type: "food"}
  ];

  var qi = 0;
  function doNext() {
    if (qi >= queries.length || state.results.length >= 60) {
      if (state.results.length === 0) {
        rd.innerHTML = '<div class="empty">没有找到推荐结果</div>';
      } else {
        renderCurrentResults();
      }
      return;
    }
    var q = queries[qi++];
    setTimeout(function() {
      try {
        var ls = new BMap.LocalSearch(state.map, {
          onSearchComplete: function(res) {
            if (res && res.getCurrentNumPois() > 0) {
              for (var i = 0; i < res.getCurrentNumPois(); i++) {
                var poi = res.getPoi(i);
                if (!poi || !poi.point || seen[poi.uid]) continue;
                seen[poi.uid] = true;
                state.results.push({
                  id: poi.uid, name: poi.title, addr: poi.address || "",
                  lat: poi.point.lat, lng: poi.point.lng,
                  type: classifyPOI(poi, q.type), tags: poi.tags || [],
                  rating: Math.round((3.8 + Math.random() * 1.1) * 10) / 10,
                  recommended: true
                });
              }
            }
            setTimeout(doNext, 150);
          }
        });
        ls.search(q.q);
      } catch (e) { setTimeout(doNext, 150); }
    }, 100);
  }
  doNext();
}

function doSearch() {
  var kw = document.getElementById("searchInput").value.trim();
  if (!kw) {
    if (state.city) { loadRecommended(); }
    else { showToast("请输入关键词，或先选择城市查看推荐"); }
    return;
  }
  if (!state.mapReady) { showToast("地图未就绪"); return; }

  var rd = document.getElementById("resultsDiv");
  rd.innerHTML = '<div class="empty">⏳ 正在搜索...</div>';

  var isFood = /美食|餐厅|小吃|火锅|烧烤|料理|咖啡|奶茶/.test(kw);
  var st = state.searchType;
  if (st === "all") st = isFood ? "food" : "scenic";

  try {
    var searchTarget = state.city ? kw + " " + state.city.name : kw;
    var ls = new BMap.LocalSearch(state.map, {
      pageCapacity: 40,
      onSearchComplete: function(res) {
        state.results = [];
        var seen = {};
        if (res && res.getCurrentNumPois() > 0) {
          for (var i = 0; i < res.getCurrentNumPois(); i++) {
            var poi = res.getPoi(i);
            if (!poi || !poi.point || seen[poi.uid]) continue;
            seen[poi.uid] = true;
            state.results.push({
              id: poi.uid, name: poi.title, addr: poi.address || "",
              lat: poi.point.lat, lng: poi.point.lng,
              type: classifyPOI(poi, st), tags: poi.tags || [],
              rating: Math.round((3.8 + Math.random() * 1.1) * 10) / 10,
              recommended: false
            });
          }
        }
        renderCurrentResults();
      }
    });
    ls.search(searchTarget);
  } catch (e) {
    rd.innerHTML = '<div class="empty">搜索出错，请重试</div>';
  }
}

/* ==================== 搜索类型过滤 ==================== */
function setSType(btn, type) {
  var btns = document.querySelectorAll(".stype");
  for (var i = 0; i < btns.length; i++) {
    btns[i].className = "stype" + (btns[i] === btn ? " active" : "");
  }
  state.searchType = type;
  if (state.results.length > 0) {
    renderCurrentResults();
  }
}

function renderCurrentResults() {
  updateSearchResultsUI();
}

/* ==================== 地图标记管理 ==================== */
function isSelected(id) {
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].id === id) return true;
  }
  return false;
}

function findPoiById(id) {
  for (var i = 0; i < state.results.length; i++) {
    if (state.results[i].id === id) return state.results[i];
  }
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].id === id) return state.selected[i];
  }
  return null;
}

function clearAllMarkers() {
  if (!state.mapReady) return;
  for (var i = 0; i < state.markers.length; i++) {
    state.map.removeOverlay(state.markers[i]);
  }
  state.markers = [];
}

/* 本地矢量图标：替代远程 marker 图片，避免图片加载失败出现破图 */
function makeMarkerIcon(color) {
  return new BMap.Symbol(BMap_Symbol_SHAPE_POINT, {
    scale: 1.5,
    fillColor: color,
    fillOpacity: 0.95,
    strokeColor: "#ffffff",
    strokeWeight: 1.5
  });
}

function addSearchMarkers() {
  /* 地图上不再绘制推荐/搜索结果标记，只保留已选地点的标记（由 updateSelectedMarkers 绘制） */
  if (!state.mapReady) return;
  clearAllMarkers();
}

function updateSelectedMarkers() {
  if (!state.mapReady) return;
  for (var i = 0; i < state.selectedMarkers.length; i++) {
    state.map.removeOverlay(state.selectedMarkers[i]);
  }
  state.selectedMarkers = [];
  for (var i = 0; i < state.selected.length; i++) {
    var p = state.selected[i];
    if (!p.lng || !p.lat) continue;
    var pt = new BMap.Point(p.lng, p.lat);
    var mk = new BMap.Marker(pt, {
      icon: makeMarkerIcon("#34a853"),
      title: p.name
    });
    mk._data = p;
    var label = new BMap.Label(String(i + 1), {offset: new BMap.Size(-4, -6)});
    label.setStyle({
      color: "#fff", fontSize: "11px", fontWeight: "bold",
      background: "transparent", border: "none"
    });
    mk.setLabel(label);
    mk.addEventListener("click", (function(pp) {
      return function() { showMapPopup(pp); };
    })(p));
    state.map.addOverlay(mk);
    state.selectedMarkers.push(mk);
  }
}

/* ==================== 住址（地图选点 + 搜索定位） ==================== */
function startHomePick() {
  if (!state.mapReady) { showToast("地图未就绪，请稍候"); return; }
  state.pickHomeMode = true;
  var btn = document.getElementById("homePickBtn");
  if (btn) { btn.textContent = "🔄 选点中…"; btn.classList.add("active"); }
  var banner = document.getElementById("homePickBanner");
  if (banner) banner.style.display = "flex";
  var hs = document.getElementById("homeSearch");
  if (hs) hs.style.display = "block";
  var mc = document.getElementById("mapContainer");
  if (mc) mc.style.cursor = "crosshair";
  showToast("在地图上点击选择住址，或使用左侧搜索");
}

function exitHomePick() {
  state.pickHomeMode = false;
  var btn = document.getElementById("homePickBtn");
  if (btn) { btn.textContent = "📍 地图选住址"; btn.classList.remove("active"); }
  var banner = document.getElementById("homePickBanner");
  if (banner) banner.style.display = "none";
  var hs = document.getElementById("homeSearch");
  if (hs) hs.style.display = "none";
  var card = document.getElementById("homeConfirmCard");
  if (card) card.style.display = "none";
  var mc = document.getElementById("mapContainer");
  if (mc) mc.style.cursor = "";
  if (state.tempHomeMarker) {
    state.map.removeOverlay(state.tempHomeMarker);
    state.tempHomeMarker = null;
  }
}

/* 逆地理编码：坐标 -> 地址文字 */
function reverseGeocode(pt, cb) {
  try {
    var gc = new BMap.Geocoder();
    gc.getLocation(pt, function(res) {
      cb(res && res.address ? res.address : "");
    });
  } catch (e) { cb(""); }
}

/* 地图选点：显示临时紫色标记 + 确认卡 */
function pickHomeAt(pt, presetAddr) {
  if (state.tempHomeMarker) state.map.removeOverlay(state.tempHomeMarker);
  var mk = new BMap.Marker(pt, {
    icon: makeMarkerIcon("#8e24aa"),
    title: "住址位置",
    enableDragging: true
  });
  mk.setLabel(new BMap.Label("🏠", {offset: new BMap.Size(-4, -8)}));
  mk.addEventListener("dragend", function() {
    var p = mk.getPosition();
    reverseGeocode(p, function(a) { showHomeConfirmCard(p, a || ""); });
  });
  state.map.addOverlay(mk);
  state.tempHomeMarker = mk;
  if (presetAddr) {
    showHomeConfirmCard(pt, presetAddr);
  } else {
    reverseGeocode(pt, function(a) { showHomeConfirmCard(pt, a || ""); });
  }
}

function showHomeConfirmCard(pt, addr) {
  var card = document.getElementById("homeConfirmCard");
  if (!card) return;
  card.style.display = "block";
  document.getElementById("homeConfirmAddr").textContent = addr || "已选择位置";
  card._pt = pt;
  card._addr = addr || "";
}

function cancelHomeConfirm() {
  if (state.tempHomeMarker) {
    state.map.removeOverlay(state.tempHomeMarker);
    state.tempHomeMarker = null;
  }
  var card = document.getElementById("homeConfirmCard");
  if (card) card.style.display = "none";
}

function confirmHome() {
  var card = document.getElementById("homeConfirmCard");
  if (!card || !card._pt) { cancelHomeConfirm(); return; }
  var pt = card._pt;
  var addr = card._addr || "";
  if (state.tempHomeMarker) {
    state.map.removeOverlay(state.tempHomeMarker);
    state.tempHomeMarker = null;
  }
  placeHomeMarker(pt.lng, pt.lat, addr);
  exitHomePick();
  updateHomeUI();
  saveState();
  redrawRoutesIfAny();
  showToast("✅ 住址已设置");
}

/* 落定正式住址标记（紫色，可拖动微调，拖动后自动刷新地址文字） */
function placeHomeMarker(lng, lat, addr) {
  if (state.homeMarker) state.map.removeOverlay(state.homeMarker);
  var pt = new BMap.Point(lng, lat);
  var mk = new BMap.Marker(pt, {
    icon: makeMarkerIcon("#8e24aa"),
    title: "住址：" + (addr || ""),
    enableDragging: true
  });
  mk.setLabel(new BMap.Label("🏠 住址", {offset: new BMap.Size(6, -28)}));
  mk.addEventListener("dragend", function() {
    var p = mk.getPosition();
    reverseGeocode(p, function(a) {
      if (state.home) {
        state.home.lng = p.lng; state.home.lat = p.lat; state.home.addr = a || "";
        updateHomeUI(); saveState(); redrawRoutesIfAny();
      }
    });
  });
  state.map.addOverlay(mk);
  state.homeMarker = mk;
  state.home = {lng: lng, lat: lat, addr: addr};
}

function updateHomeUI() {
  var info = document.getElementById("homeInfo");
  if (!info) return;
  var clearBtn = document.getElementById("homeClearBtn");
  if (state.home) {
    info.innerHTML = "🏠 <b>" + (state.home.addr || "已设置") + "</b> · 每天出发返回";
    if (clearBtn) clearBtn.style.display = "inline-block";
  } else {
    info.textContent = "每天从住址出发并返回（选填）";
    if (clearBtn) clearBtn.style.display = "none";
  }
}

function removeHome(quiet) {
  if (state.homeMarker) {
    state.map.removeOverlay(state.homeMarker);
    state.homeMarker = null;
  }
  state.home = null;
  exitHomePick();
  updateHomeUI();
  saveState();
  redrawRoutesIfAny();
  if (!quiet) showToast("已清除住址");
}

function redrawRoutesIfAny() {
  if (state.itinerary) drawItineraryRoutes();
}

/* 住址搜索：限定当前城市 */
function homeSearch() {
  var input = document.getElementById("homeSearchInput");
  var kw = input ? input.value.trim() : "";
  if (!kw) { showToast("请输入关键词"); return; }
  var box = document.getElementById("homeSearchResults");
  if (!box) return;
  box.innerHTML = '<div class="hs-status">🔍 正在搜索...</div>';
  try {
    var target = state.city ? kw + " " + state.city.name : kw;
    var ls = new BMap.LocalSearch(state.map, {
      pageCapacity: 8,
      onSearchComplete: function(res) {
        box.innerHTML = "";
        if (!res || res.getCurrentNumPois() === 0) {
          box.innerHTML = '<div class="hs-status">未找到，换个关键词试试</div>';
          return;
        }
        for (var i = 0; i < res.getCurrentNumPois(); i++) {
          var poi = res.getPoi(i);
          if (!poi || !poi.point) continue;
          var addr = (poi.title || "") + (poi.address ? " · " + poi.address : "");
          var item = document.createElement("div");
          item.className = "hs-item";
          var ico = document.createElement("span");
          ico.className = "hs-ico"; ico.textContent = "📍";
          var info = document.createElement("div");
          info.className = "hs-info";
          var name = document.createElement("div");
          name.className = "hs-name"; name.textContent = poi.title || "";
          var adr = document.createElement("div");
          adr.className = "hs-addr"; adr.textContent = poi.address || "";
          info.appendChild(name); info.appendChild(adr);
          var action = document.createElement("span");
          action.className = "hs-action"; action.textContent = "选择 →";
          item.appendChild(ico); item.appendChild(info); item.appendChild(action);
          (function(pt2, adr2) {
            item.addEventListener("click", function() { chooseHomePoi(pt2, adr2); });
          })(poi.point, addr);
          box.appendChild(item);
        }
      }
    });
    ls.search(target);
  } catch (e) {
    box.innerHTML = '<div class="hs-status">搜索出错，请重试</div>';
  }
}

/* 搜索结果 -> 地图定位 + 确认卡 */
function chooseHomePoi(pt, addr) {
  state.map.centerAndZoom(new BMap.Point(pt.lng, pt.lat), 15);
  pickHomeAt(pt, addr);
}

/* 适配视野到一组坐标点 */
function fitMapToPoints(pts) {
  if (!state.mapReady || pts.length === 0) return;
  if (pts.length === 1) {
    state.map.centerAndZoom(new BMap.Point(pts[0].lng, pts[0].lat), 15);
    return;
  }
  var bounds = new BMap.Bounds();
  for (var i = 0; i < pts.length; i++) {
    bounds.extend(new BMap.Point(pts[i].lng, pts[i].lat));
  }
  state.map.setViewport(bounds, {enableAnimation: true, margins: [70, 70, 70, 70]});
}

function fitMapToSelected() {
  var pts = [];
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].lng && state.selected[i].lat) {
      pts.push(state.selected[i]);
    }
  }
  if (pts.length === 0) {
    showToast("还没有已选地点");
    return;
  }
  fitMapToPoints(pts);
}

/* 地图工具栏：适配全部（优先行程，其次已选） */
function fitMapToAll() {
  if (state.itinerary) { fitToItinerary(); return; }
  fitMapToSelected();
}

/* ==================== 地图弹窗 ==================== */
function showMarkerInfo(id) {
  var p = findPoiById(id);
  if (!p || !p.lng || !p.lat) return;
  state.map.centerAndZoom(new BMap.Point(p.lng, p.lat), 16);
  showMapPopup(p);
}

function showMapPopup(p) {
  var icon = p.type === "food" ? "🍜" : "🏛️";
  var typeLabel = p.type === "food" ? "美食" : "景点";
  var sel = isSelected(p.id);
  var html = '<div class="map-popup">' +
    '<div class="pp-name">' + icon + " " + p.name + '</div>' +
    '<div class="pp-addr">' + (p.addr || "") + '</div>' +
    '<span class="pp-type ' + p.type + '">' + typeLabel + '</span>' +
    (p.rating ? '<span class="pp-rating">⭐ ' + p.rating.toFixed(1) + '</span>' : "") +
    '<div class="pp-actions">' +
    '<button class="pp-btn primary" onclick="showPoiDetail(findPoiById(\'' + p.id + '\'))">📋 详情</button>' +
    '<button class="pp-btn' + (sel ? " selected" : "") + '" onclick="toggleSelect(\'' + p.id + '\')">' + (sel ? "✓ 已选" : "+ 选择") + '</button>' +
    '</div>' +
    '</div>';
  var iw = new BMap.InfoWindow(html, {
    width: 230, height: 118, title: "",
    enableAutoPan: true
  });
  state.map.openInfoWindow(iw, new BMap.Point(p.lng, p.lat));
}

/* ==================== 选择管理 ==================== */
function toggleSelect(id) {
  var p = findPoiById(id);
  if (!p) return;

  var idx = -1;
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].id === id) { idx = i; break; }
  }
  if (idx >= 0) {
    state.selected.splice(idx, 1);
    showToast("已移除: " + p.name);
  } else {
    state.selected.push({
      id: p.id, name: p.name, addr: p.addr,
      lat: p.lat, lng: p.lng, type: p.type,
      tags: p.tags, rating: p.rating,
      recommended: p.recommended
    });
    showToast("✅ 已添加: " + p.name);
  }
  saveState();
  updateAllUI();
}

function removeSelected(id) {
  var idx = -1;
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].id === id) { idx = i; break; }
  }
  if (idx >= 0) {
    state.selected.splice(idx, 1);
    saveState();
    updateAllUI();
  }
}

function clearAll() {
  if (state.selected.length === 0) return;
  if (!confirm("确定清空所有已选地点吗？")) return;
  state.selected = [];
  saveState();
  updateAllUI();
}

/* ==================== UI 更新 ==================== */
function updateAllUI() {
  updateBadge();
  updateSelectedUI();
  updateSearchResultsUI();
  updatePlanCount();
  updateSelectedMarkers();
  updateMapToolbarInfo();
}

function updateBadge() {
  document.getElementById("badgeSelected").textContent = state.selected.length;
}

function updatePlanCount() {
  document.getElementById("planCount").textContent = state.selected.length;
  var btn = document.querySelector(".gen-btn");
  btn.disabled = state.selected.length === 0;
}

function updateMapToolbarInfo() {
  var el = document.getElementById("mapToolbarInfo");
  if (!el) return;
  var txt = "已选 <b>" + state.selected.length + "</b> 个地点";
  if (state.itinerary) {
    txt += " · 行程 <b>" + state.itinerary.days.length + "</b> 天";
  }
  el.innerHTML = txt;
}

function updateSelectedUI() {
  var list = document.getElementById("selList");
  var count = document.getElementById("selCount");
  var n = state.selected.length;
  count.textContent = "已选择 " + n + " 个地点";
  if (n === 0) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div>还没有选择地点</div></div>';
    return;
  }
  var html = "";
  for (var i = 0; i < state.selected.length; i++) {
    var p = state.selected[i];
    var isFood = p.type === "food";
    var icon = isFood ? "🍜" : "🏛️";
    var typeLabel = isFood ? "美食" : "景点";
    var typeClass = isFood ? "food" : "scenic";
    var recTag = p.recommended ? '<span class="si-badge rec">✨推荐</span>' : "";
    var stars = "";
    var r = p.rating || 4;
    for (var s = 0; s < Math.min(Math.round(r), 5); s++) stars += "⭐";
    html += '<div class="si">' +
      '<div class="si-inner">' +
      '<div class="si-icon ' + typeClass + '">' + icon + '</div>' +
      '<div class="si-info" style="cursor:pointer" onclick="showMarkerInfo(\'' + p.id + '\')" title="在地图中查看">' +
      '<div class="si-top">' +
      '<span class="si-name">' + p.name + '</span>' +
      '<span class="si-badge ' + typeClass + '">' + typeLabel + '</span>' +
      recTag +
      '</div>' +
      '<div class="si-addr">' + (p.addr || "") + '</div>' +
      '<div class="si-bottom">' +
      '<span class="si-num">#' + (i + 1) + '</span>' +
      '<span class="si-stars">' + stars + ' ' + r.toFixed(1) + '</span>' +
      '</div>' +
      '</div>' +
      '<button class="si-del" onclick="removeSelected(\'' + p.id + '\')" title="移除">✕</button>' +
      '</div>' +
      '</div>';
  }
  list.innerHTML = html;
}

function updateSearchResultsUI() {
  var rd = document.getElementById("resultsDiv");
  if (state.results.length === 0) {
    rd.innerHTML = '<div class="empty">没有找到结果</div>';
    return;
  }

  var scenic = [], food = [];
  for (var i = 0; i < state.results.length; i++) {
    var p = state.results[i];
    if (p.type === "food") food.push(p);
    else scenic.push(p);
  }

  var filter = state.searchType;
  var html = "";

  if (scenic.length > 0 && (filter === "all" || filter === "scenic")) {
    html += '<div class="cat-header">🏛️ 景点 <span class="cat-count">' + scenic.length + '个</span></div>';
    for (var i = 0; i < scenic.length; i++) {
      html += renderResultItem(scenic[i]);
    }
  }

  if (scenic.length > 0 && food.length > 0 && filter === "all") {
    html += '<div class="cat-divider"></div>';
  }

  if (food.length > 0 && (filter === "all" || filter === "food")) {
    html += '<div class="cat-header">🍜 美食 <span class="cat-count">' + food.length + '个</span></div>';
    for (var i = 0; i < food.length; i++) {
      html += renderResultItem(food[i]);
    }
  }

  if (html === "") {
    html = '<div class="empty">当前分类没有结果，试试切换到"全部"</div>';
  }

  rd.innerHTML = html;
  addSearchMarkers();
}

function renderResultItem(p) {
  var isFood = p.type === "food";
  var sel = isSelected(p.id);
  var icon = isFood ? "🍜" : "🏛️";
  var typeLabel = isFood ? "美食" : "景点";
  var recTag = p.recommended ? '<span class="si-badge rec">✨推荐</span>' : "";
  var tags = "";
  for (var j = 0; j < Math.min(p.tags.length, 2); j++) {
    tags += '<span class="ri-tag">' + p.tags[j] + '</span>';
  }
  var stars = "⭐ " + (p.rating || 4).toFixed(1);
  return '<div class="ri' + (sel ? " selected" : "") + (p.recommended ? " rec" : "") + '" onclick="showMarkerInfo(\'' + p.id + '\')">' +
    '<div class="ri-icon ' + p.type + '">' + icon + '</div>' +
    '<div class="ri-info">' +
    '<div class="ri-name">' + p.name + ' ' + recTag + '</div>' +
    '<div class="ri-rating">' + stars + '</div>' +
    '<div class="ri-addr">' + (p.addr || "") + '</div>' +
    '<div class="ri-tags"><span class="ri-tag type' + (isFood ? " food" : "") + '">' + typeLabel + '</span>' + tags + '</div>' +
    '</div>' +
    '<div class="ri-actions">' +
    '<button class="ri-add' + (sel ? " added" : "") + '" onclick="event.stopPropagation(); toggleSelect(\'' + p.id + '\')">' +
    (sel ? "✓ 已选" : "+ 添加") + '</button>' +
    '<button class="ri-detail" onclick="event.stopPropagation(); showPoiDetail(findPoiById(\'' + p.id + '\'))">📋 详情</button>' +
    '</div>' +
    '</div>';
}

/* ==================== 行程生成（DP 优化） ==================== */
/* 各交通方式平均速度（米/分钟） */
var MODE_SPEED = {walking: 80, cycling: 200, transit: 320, driving: 400, taxi: 420};
/* 不同节奏档位下每天的最多地点数 */
var PACE_PER_DAY = {relax: 4, normal: 7, packed: 99};

/* 对一段距离，从已选交通方式中选耗时最短的（公交含等车、步行超 2km 自动不选） */
function pickFastestMode(disMeters, modes) {
  var bestMode = modes[0], bestMin = Infinity, feasible = false;
  for (var i = 0; i < modes.length; i++) {
    var m = modes[i];
    var sp = MODE_SPEED[m] || 400;
    var t = disMeters / sp;
    if (m === "transit") t += 5;
    if (m === "walking" && disMeters > 2000) continue;
    feasible = true;
    if (t < bestMin) { bestMin = t; bestMode = m; }
  }
  if (!feasible) {
    bestMode = modes[modes.length - 1];
    bestMin = disMeters / (MODE_SPEED[bestMode] || 400) + (bestMode === "transit" ? 5 : 0);
  }
  return {mode: bestMode, min: Math.max(1, Math.round(bestMin))};
}

/* 判断 POI 是否命中美食/景点偏好关键词 */
function matchPref(p, prefs) {
  if (!prefs || prefs.length === 0) return false;
  var text = (p.name || "") + " " + (p.tags ? p.tags.join(" ") : "");
  var kw = {
    local: ["小笼", "生煎", "本地", "本帮", "老字号", "早茶", "夜宵", "灌汤包"],
    formal: ["餐厅", "饭", "馆", "楼", "酒楼", "宴", "料理", "火锅", "烧烤", "大排档"],
    snack: ["小吃", "串", "粉", "面", "糕", "饼", "糖", "鸭", "鸡", "汤包", "粥"],
    cafe: ["咖啡", "奶茶", "茶", "甜品", "蛋糕", "烘焙", "冰室"],
    nature: ["公园", "山", "湖", "江", "海", "湾", "岛", "森林", "湿地", "植物园", "动物园", "海滩"],
    history: ["博物馆", "寺", "庙", "古镇", "故居", "旧址", "遗址", "纪念馆", "塔", "宫", "城", "书院"],
    family: ["乐园", "亲子", "海洋馆", "科技馆", "动物园", "水族馆", "游乐"],
    shopping: ["街", "商场", "购物", "步行街", "广场", "市场", "夜市"],
    night: ["塔", "夜景", "大桥", "江", "观景", "日落", "天台", "灯光", "摩天"]
  };
  var list = [];
  for (var i = 0; i < prefs.length; i++) {
    var arr = kw[prefs[i]];
    if (arr) list = list.concat(arr);
  }
  for (var i = 0; i < list.length; i++) {
    if (text.indexOf(list[i]) >= 0) return true;
  }
  return false;
}

/* 一键推荐参数 */
function autoFillSettings() {
  var n = state.selected.length;
  var el = document.getElementById("dayCount");
  if (el) el.value = Math.max(1, Math.min(14, Math.round(n / 4)));
  var pace = document.querySelector('input[name="pace"][value="normal"]');
  if (pace) pace.checked = true;
  var modes = document.querySelectorAll('input[name="transport"]');
  for (var i = 0; i < modes.length; i++) {
    modes[i].checked = (modes[i].value === "walking" || modes[i].value === "transit" || modes[i].value === "driving");
  }
  var r = document.getElementById("prefRating");
  if (r) r.value = "4";
  var nb = document.getElementById("prefNearby");
  if (nb) nb.value = "3";
  showToast("已按" + n + "个地点推荐约" + el.value + "天，适中节奏");
}

function generatePlan() {
  if (state.selected.length === 0) {
    showToast("请先选择景点或美食");
    switchTab("search");
    return;
  }

  var days = parseInt(document.getElementById("dayCount").value) || 3;
  var dayStart = document.getElementById("dayStart").value || "08:00";
  var dayEnd = document.getElementById("dayEnd").value || "21:00";
  var visitDur = parseFloat(document.getElementById("visitDur").value) || 1.5;
  var mealDur = parseFloat(document.getElementById("mealDur").value) || 1;
  var maxTravel = parseInt(document.getElementById("maxTravel").value) || 60;
  var startDate = document.getElementById("startDate").value;

  /* 交通方式多选 */
  var transport = [];
  var trans = document.querySelectorAll('input[name="transport"]:checked');
  for (var i = 0; i < trans.length; i++) transport.push(trans[i].value);
  if (transport.length === 0) { showToast("请至少勾选一种交通方式"); return; }

  /* 节奏档位 */
  var paceEl = document.querySelector('input[name="pace"]:checked');
  var pace = paceEl ? paceEl.value : "normal";
  var perDay = PACE_PER_DAY[pace] || 7;

  /* 偏好（滑块/多选） */
  var ratingW = parseInt(document.getElementById("prefRating").value) || 3;
  var nearbyW = parseInt(document.getElementById("prefNearby").value) || 3;
  var prefMix = document.getElementById("prefMix").checked;
  var foodPrefs = [], poiPrefs = [];
  var fp = document.querySelectorAll('input[name="foodPref"]:checked');
  for (var i = 0; i < fp.length; i++) foodPrefs.push(fp[i].value);
  var pp2 = document.querySelectorAll('input[name="poiPref"]:checked');
  for (var i = 0; i < pp2.length; i++) poiPrefs.push(pp2[i].value);

  var places = state.selected.slice();

  if (places.length < days) {
    showToast("地点(" + places.length + ")不能少于天数(" + days + ")");
    return;
  }

  /* 主流程（可能等待住址异步解析） */
  var gl = document.getElementById("genLoading");
  if (gl) gl.style.display = "flex";
  var cityPt = state.city ? {lng: state.city.lng, lat: state.city.lat} : null;

  var run = function(home, wx) {
    showToast("⏳ 动态规划优化中...");

    var n = places.length;
    var dist = [], bestMode = [];
    for (var i = 0; i < n; i++) {
      dist[i] = [];
      bestMode[i] = [];
      for (var j = 0; j < n; j++) {
        if (i === j) { dist[i][j] = 0; bestMode[i][j] = ""; }
        else {
          var d = calcDistance(places[i].lng, places[i].lat, places[j].lng, places[j].lat);
          var r = pickFastestMode(d, transport);
          dist[i][j] = r.min;
          bestMode[i][j] = r.mode;
        }
      }
    }

    /* 综合评分（偏好可调） */
    var ratingWeight = 0.5 + ratingW * 0.4;      /* 1星→0.9，5星→2.5 */
    var scores = [];
    for (var i = 0; i < n; i++) {
      var s = (places[i].rating || 4) * ratingWeight;
      if (places[i].recommended) s += 1.5;
      if (places[i].type === "food") {
        s += 0.5;
        if (matchPref(places[i], foodPrefs)) s += 0.4;
      } else {
        if (matchPref(places[i], poiPrefs)) s += 0.4;
      }
      scores.push(s);
    }

    /* 从几何中心出发的最近邻初始排序 */
    var clng = 0, clat = 0;
    for (var i = 0; i < n; i++) { clng += places[i].lng; clat += places[i].lat; }
    clng /= n; clat /= n;

    var ci = 0, minD = Infinity;
    for (var i = 0; i < n; i++) {
      var d = calcDistance(places[i].lng, places[i].lat, clng, clat);
      if (d < minD) { minD = d; ci = i; }
    }

    var order = [ci];
    var visited = {};
    visited[ci] = true;
    while (order.length < n) {
      var last = order[order.length - 1];
      var best = -1, bestD = Infinity;
      for (var i = 0; i < n; i++) {
        if (visited[i]) continue;
        var cand = dist[last][i] * (1.0 - nearbyW * 0.12);   /* 就近权重 1-5 */
        if (cand < bestD) { bestD = cand; best = i; }
      }
      if (best >= 0) { order.push(best); visited[best] = true; }
    }

    /* DP：把 n 个地点分成 days 天，最大化每日评分 */
    var negInf = -999999;
    var dp = [], part = [];
    for (var i = 0; i <= n; i++) {
      dp[i] = [];
      part[i] = [];
      for (var j = 0; j <= days; j++) {
        dp[i][j] = negInf;
        part[i][j] = 0;
      }
    }
    dp[0][0] = 0;

    for (var i = 1; i <= n; i++) {
      for (var j = 1; j <= Math.min(i, days); j++) {
        for (var k = j - 1; k < i; k++) {
          if (dp[k][j - 1] === negInf) continue;
          var dayScore = 0, travel = 0, hasFood = false, hasScenic = false;
          for (var m = k; m < i; m++) {
            var idx = order[m];
            dayScore += scores[idx];
            /* 雨天：户外景点降权、美食升权 */
            if (wx && isRainyDay(wx[j - 1])) {
              if (places[idx].type === "food") dayScore += 0.6;
              else dayScore -= 1.4;
            }
            if (places[idx].type === "food") hasFood = true;
            else hasScenic = true;
            if (m > k) travel += dist[order[m - 1]][order[m]];
          }
          if (prefMix && hasFood && hasScenic) dayScore += 3;
          var cnt = i - k;
          if (cnt > perDay) dayScore -= 8 * (cnt - perDay);  /* 节奏档位惩罚 */
          var totalMin = cnt * (visitDur * 60) + travel;
          var availMin = timeToMin(dayEnd) - timeToMin(dayStart);
          var penalty = totalMin > availMin ? -50 * (totalMin - availMin) / availMin : 0;
          dayScore += penalty;
          var total = dp[k][j - 1] + dayScore;
          if (total > dp[i][j]) {
            dp[i][j] = total;
            part[i][j] = k;
          }
        }
      }
    }

    /* 回溯每天的分配 */
    var dayParts = [];
    var cur = n;
    for (var j = days; j >= 1; j--) {
      var start = part[cur][j];
      var slice = [];
      for (var t = start; t < cur; t++) {
        slice.push(order[t]);
      }
      dayParts.unshift(slice);
      cur = start;
    }

    /* 构建行程对象 */
    var itinerary = {
      days: [],
      startDate: startDate || new Date().toISOString().slice(0, 10),
      settings: {
        days: days, dayStart: dayStart, dayEnd: dayEnd,
        visitDur: visitDur, mealDur: mealDur, maxTravel: maxTravel,
        transport: transport, pace: pace,
        home: home ? (home.addr || "") : "",
        city: state.city ? state.city.name : ""
      }
    };

    var stepNum = 1;
    for (var d = 0; d < dayParts.length; d++) {
      var dayPlaces = [];
      for (var t = 0; t < dayParts[d].length; t++) {
        dayPlaces.push(places[dayParts[d][t]]);
      }
      var optimized = optimizeDayRoute(dayPlaces);
      var date = new Date(itinerary.startDate);
      date.setDate(date.getDate() + d);
      var dateStr = date.toLocaleDateString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", weekday: "long"
      });

      var dayPlan = {
        day: d + 1, date: dateStr, steps: [],
        totalTravel: 0, totalVisit: 0
      };
      var ct = dayStart;

      if (home && optimized.length > 0) {
        var r0 = pickFastestMode(calcDistance(home.lng, home.lat, optimized[0].lng, optimized[0].lat), transport);
        var t0 = Math.min(r0.min, maxTravel);
        dayPlan.steps.push({
          type: "start", name: "🏨 从住址出发",
          time: dayStart, detail: (home.addr || "住址") + "（" + getTransportLabel(r0.mode) + " " + t0 + "分钟）",
          place: null
        });
        dayPlan.totalTravel += t0;
        ct = addTime(ct, t0);
        dayPlan.steps.push({
          type: "transit", name: "前往 " + optimized[0].name,
          time: ct, detail: getTransportIcon(r0.mode) + " " + getTransportLabel(r0.mode) + " 约" + t0 + "分钟",
          place: null, mode: r0.mode
        });
      } else {
        dayPlan.steps.push({
          type: "start",
          name: "第" + (d + 1) + "天出发",
          time: ct, detail: "出发地点",
          place: null
        });
      }

      for (var i = 0; i < optimized.length; i++) {
        var pp = optimized[i];
        var isF = pp.type === "food";
        var dur = isF ? mealDur : visitDur;

        if (i > 0) {
          var prev = optimized[i - 1];
          var pi = -1, pj = -1;
          for (var t = 0; t < places.length; t++) {
            if (places[t].id === prev.id) pi = t;
            if (places[t].id === pp.id) pj = t;
          }
          var travelMin = Math.min(dist[pi][pj], maxTravel);
          var tMode = bestMode[pi][pj] || "walking";
          dayPlan.totalTravel += travelMin;
          ct = addTime(ct, travelMin);
          dayPlan.steps.push({
            type: "transit", name: "前往 " + pp.name,
            time: ct, detail: getTransportIcon(tMode) + " " + getTransportLabel(tMode) + " 约" + travelMin + "分钟",
            place: null, mode: tMode
          });
        }

        ct = addTime(ct, dur * 60);
        dayPlan.totalVisit += dur * 60;
        dayPlan.steps.push({
          type: isF ? "food" : "attr",
          name: pp.name, time: ct,
          detail: (isF ? "🍜 美食" : "🏛️ 景点") + " · 停留" + dur + "小时 · ⭐" + (pp.rating || 4).toFixed(1),
          place: pp, stepNum: stepNum++
        });
      }

      if (home && optimized.length > 0) {
        var last = optimized[optimized.length - 1];
        var rn = pickFastestMode(calcDistance(last.lng, last.lat, home.lng, home.lat), transport);
        var tn = Math.min(rn.min, maxTravel);
        dayPlan.totalTravel += tn;
        ct = addTime(ct, tn);
        dayPlan.steps.push({
          type: "transit", name: "返回住址",
          time: ct, detail: getTransportIcon(rn.mode) + " " + getTransportLabel(rn.mode) + " 约" + tn + "分钟",
          place: null, mode: rn.mode
        });
      }

      dayPlan.steps.push({
        type: "end", name: "结束行程",
        time: dayEnd, detail: home ? "返回住址 / 休息" : "返回 / 休息", place: null
      });

      if (wx && wx[d]) dayPlan.weather = wx[d];
      itinerary.days.push(dayPlan);
    }

    state.itinerary = itinerary;
    document.getElementById("exportBtn").style.display = "inline-block";
    var _gl = document.getElementById("genLoading");
    if (_gl) _gl.style.display = "none";
    updateItinerary();
    drawItineraryRoutes();
    switchTab("itinerary");
    showToast("✅ 行程规划完成！共" + days + "天，" + n + "个地点");
  };

  /* 住址直接取地图选点结果（state.home），无住址则按默认逻辑 */
  fetchWeather(cityPt ? cityPt.lng : null, cityPt ? cityPt.lat : null, days, function(wx) {
    setTimeout(function() { run(state.home, wx); }, 700);
  });
}

function getTransportIcon(m) {
  var icons = {walking: "🚶", driving: "🚗", transit: "🚌", cycling: "🚲", taxi: "🚕"};
  return icons[m] || "🚗";
}

function optimizeDayRoute(pl) {
  if (pl.length <= 1) return pl;
  var n = pl.length;
  var clng = 0, clat = 0;
  for (var i = 0; i < n; i++) { clng += pl[i].lng; clat += pl[i].lat; }
  clng /= n; clat /= n;
  var si = 0, md = Infinity;
  for (var i = 0; i < n; i++) {
    var d = calcDistance(pl[i].lng, pl[i].lat, clng, clat);
    if (d < md) { md = d; si = i; }
  }
  var res = [pl[si]];
  var used = {};
  used[si] = true;
  var last = si;
  while (res.length < n) {
    var best = -1, bd = Infinity;
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      var d = calcDistance(pl[last].lng, pl[last].lat, pl[i].lng, pl[i].lat);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { res.push(pl[best]); used[best] = true; last = best; }
  }
  return res;
}

/* ==================== 行程显示 ==================== */
function switchTab(tab) {
  var tabs = document.querySelectorAll(".tab");
  var panels = document.querySelectorAll(".tab-panel");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].className = "tab" + (tabs[i].getAttribute("data-tab") === tab ? " active" : "");
  }
  for (var i = 0; i < panels.length; i++) {
    panels[i].className = "tab-panel" + (panels[i].id.replace("panel", "").toLowerCase() === tab ? " active" : "");
  }
  if (tab === "itinerary") updateItinerary();
  if (tab === "selected") updateSelectedUI();
  if (tab === "settings") updatePlanCount();
}

function updateItinerary() {
  var noI = document.getElementById("noItinerary");
  var content = document.getElementById("itineraryContent");
  if (state.itinerary) {
    noI.style.display = "none";
    content.style.display = "flex";
    renderItinerary();
  } else {
    noI.style.display = "block";
    content.style.display = "none";
  }
}

function fmtMin(m) {
  if (!m && m !== 0) return "-";
  m = Math.round(m);
  var h = Math.floor(m / 60), mm = m % 60;
  if (h === 0) return mm + "分钟";
  if (mm === 0) return h + "小时";
  return h + "小时" + mm + "分";
}

function renderItineraryStats(it) {
  var totalTravel = 0, totalVisit = 0, cnt = 0, sumR = 0, rainy = 0;
  for (var d = 0; d < it.days.length; d++) {
    var day = it.days[d];
    if (day.totalTravel) totalTravel += day.totalTravel;
    if (day.totalVisit) totalVisit += day.totalVisit;
    if (day.weather && isRainyDay(day.weather)) rainy++;
    for (var s = 0; s < day.steps.length; s++) {
      var st = day.steps[s];
      if (st.place && (st.type === "attr" || st.type === "food")) {
        cnt++; sumR += parseFloat(st.place.rating) || 4;
      }
    }
  }
  var avg = cnt ? (sumR / cnt).toFixed(1) : "-";
  var bud = estimateBudget(it);
  var wxTxt = rainy > 0 ? ' · <span style="color:#e53935">🌧️ ' + rainy + '天有雨</span>' : "";
  return '<div class="itin-stats">' +
    '<div class="is-item"><b>' + it.days.length + '</b><span>天行程</span></div>' +
    '<div class="is-item"><b>' + cnt + '</b><span>个地点</span></div>' +
    '<div class="is-item"><b>' + fmtMin(totalTravel) + '</b><span>交通</span></div>' +
    '<div class="is-item"><b>' + fmtMin(totalVisit) + '</b><span>游玩</span></div>' +
    '<div class="is-item"><b>⭐' + avg + '</b><span>平均评分</span></div>' +
    '</div>' +
    '<div class="itin-budget">💰 预计花费（单人估算）：交通 ¥' + bud.traffic + ' + 门票 ¥' + bud.ticket +
    ' + 美食 ¥' + bud.food + ' ≈ <b>¥' + bud.total + '</b>' + wxTxt + '</div>';
}

function renderItinerary() {
  if (!state.itinerary) return;
  var it = state.itinerary;
  var header = document.getElementById("itinHeader");
  var body = document.getElementById("itinBody");

  var totalPlaces = 0;
  for (var d = 0; d < it.days.length; d++) {
    for (var s = 0; s < it.days[d].steps.length; s++) {
      if (it.days[d].steps[s].type === "attr" || it.days[d].steps[s].type === "food") {
        totalPlaces++;
      }
    }
  }

  var cityName = it.settings.city || "";
  var paceNames = {relax: "轻松", normal: "适中", packed: "紧凑"};
  var paceTxt = paceNames[it.settings.pace] ? " · " + paceNames[it.settings.pace] + "节奏" : "";
  var homeTxt = it.settings.home ? " · 🏨 住址出发" : "";
  header.innerHTML = '<h3>📅 ' + cityName + ' · ' + it.days.length + '天 ' + totalPlaces + '个地点</h3>' +
    '<div class="itin-summary">出发: ' + it.startDate +
    ' · 每日 ' + it.settings.dayStart + '-' + it.settings.dayEnd +
    ' · ' + getTransportLabel(it.settings.transport) + paceTxt + homeTxt + '</div>' +
    '<button class="itin-map-btn" onclick="fitToItinerary()">📍 地图查看路线</button>' +
    '<button class="itin-map-btn" onclick="window.print()" style="right:96px">🖨️ 打印</button>';

  var html = renderItineraryStats(it);
  for (var d = 0; d < it.days.length; d++) {
    var day = it.days[d];
    var placeCount = 0;
    for (var s = 0; s < day.steps.length; s++) {
      if (day.steps[s].type === "attr" || day.steps[s].type === "food") placeCount++;
    }
    var wxHtml = day.weather ? '<span class="weather-tag">' + weatherDesc(day.weather) + '</span>' : "";
    html += '<div class="dc">' +
      '<div class="dc-head" onclick="focusDay(' + d + ')" title="在地图上查看此日路线" style="cursor:pointer">' +
      '<div><span class="dc-num" style="color:' + DAY_COLORS[d % DAY_COLORS.length] + '">📅 第' + day.day + '天</span> <span class="dc-date">' + day.date + '</span>' + wxHtml + '</div>' +
      '<div class="dc-stats">' + placeCount + '个地点 🗺️</div>' +
      '</div><div class="dc-body">';

    for (var s = 0; s < day.steps.length; s++) {
      var step = day.steps[s];
      if (step.type === "transit") {
        html += '<div class="conn"></div>' +
          '<div class="rs" style="opacity:0.7">' +
          '<div class="rs-mk transit">' + getTransportIcon(step.mode) + '</div>' +
          '<div class="rs-info">' +
          '<div class="rs-detail">' + step.name + '</div>' +
          '<div class="rs-time">' + (step.detail || "") + '</div>' +
          '</div></div>';
        continue;
      }
      var mc = step.type === "start" ? "start" :
               step.type === "end" ? "end" :
               step.type === "food" ? "food" : "attr";
      var ml = step.type === "start" ? "🚀" :
               step.type === "end" ? "🏁" :
               step.type === "food" ? "🍜" : "📍";
      var click = step.place ? 'onclick="showMarkerInfo(\'' + step.place.id + '\')" style="cursor:pointer"' : "";
      html += '<div class="rs" ' + click + '>' +
        '<div class="rs-mk ' + mc + '">' + ml + '</div>' +
        '<div class="rs-info">' +
        '<div class="rs-name">' + (step.type === "start" || step.type === "end" ? step.name : (step.stepNum ? step.stepNum + ". " : "") + step.name) + '</div>' +
        '<div class="rs-detail">' + (step.detail || "") + '</div>' +
        '<div class="rs-time">⏰ ' + step.time + '</div>' +
        '</div></div>';
    }

    html += '</div></div>';
  }
  body.innerHTML = html;
}

function getTransportLabel(m) {
  if (Array.isArray(m)) {
    var parts = [];
    for (var i = 0; i < m.length; i++) parts.push(getTransportLabel(m[i]));
    return parts.join(" / ");
  }
  var labels = {walking: "步行", driving: "驾车", transit: "公交/地铁", cycling: "骑行", taxi: "打车"};
  return labels[m] || m;
}

/* ==================== 地图路线可视化 ==================== */
function clearRoutes() {
  if (!state.mapReady) return;
  for (var i = 0; i < state.routeLines.length; i++) {
    state.map.removeOverlay(state.routeLines[i].line);
  }
  state.routeLines = [];
  var legend = document.getElementById("mapLegend");
  if (legend) legend.style.display = "none";
  var btn = document.getElementById("routeToggleBtn");
  if (btn) btn.textContent = "🙈 隐藏路线";
  state.routeVisible = true;
}

/* 生成行程后：绘制每天路线 + 图例 + 视野适配 */
function drawItineraryRoutes() {
  clearRoutes();
  if (!state.itinerary || !state.mapReady) return;

  for (var d = 0; d < state.itinerary.days.length; d++) {
    var day = state.itinerary.days[d];
    var pts = [];
    /* 每天路线从住址起点拉出 */
    if (state.home && state.home.lng && state.home.lat) {
      pts.push(new BMap.Point(state.home.lng, state.home.lat));
    }
    for (var s = 0; s < day.steps.length; s++) {
      var step = day.steps[s];
      if (step.place && step.place.lng && step.place.lat) {
        pts.push(new BMap.Point(step.place.lng, step.place.lat));
      }
    }
    if (pts.length >= 2) {
      var line = new BMap.Polyline(pts, {
        strokeColor: DAY_COLORS[d % DAY_COLORS.length],
        strokeWeight: 5,
        strokeOpacity: 0.85,
        strokeStyle: "dashed"
      });
      state.map.addOverlay(line);
      state.routeLines.push({line: line, dayIndex: d});
    }
  }

  drawRouteLegend();
  updateMapToolbarInfo();
  fitToItinerary();
}

function drawRouteLegend() {
  var legend = document.getElementById("mapLegend");
  if (!legend) return;
  if (!state.routeLines.length) {
    legend.style.display = "none";
    return;
  }
  var html = '<div class="legend-title">🗺️ 点击查看每日路线</div>';
  if (state.home) {
    html += '<div class="legend-home">🏠 住址 · 每天起点/终点</div>';
  }
  for (var i = 0; i < state.routeLines.length; i++) {
    var rl = state.routeLines[i];
    var day = state.itinerary.days[rl.dayIndex];
    html += '<div class="legend-item" onclick="focusDay(' + rl.dayIndex + ')">' +
      '<span class="legend-dot" style="background:' + DAY_COLORS[rl.dayIndex % DAY_COLORS.length] + '"></span>' +
      '第' + day.day + '天' +
      '</div>';
  }
  html += '<div class="legend-item legend-all" onclick="fitToItinerary()">📍 全部适配</div>';
  legend.innerHTML = html;
  legend.style.display = "block";
}

/* 聚焦某一天：高亮该天路线，淡化其他 */
function focusDay(di) {
  if (!state.mapReady || !state.itinerary) return;
  var day = state.itinerary.days[di];
  if (!day) return;
  var pts = [];
  if (state.home && state.home.lng && state.home.lat) {
    pts.push(state.home);
  }
  for (var s = 0; s < day.steps.length; s++) {
    if (day.steps[s].place && day.steps[s].place.lng && day.steps[s].place.lat) {
      pts.push(day.steps[s].place);
    }
  }
  fitMapToPoints(pts);
  for (var i = 0; i < state.routeLines.length; i++) {
    var isTarget = state.routeLines[i].dayIndex === di;
    state.routeLines[i].line.setStrokeOpacity(isTarget ? 0.95 : 0.15);
    state.routeLines[i].line.setStrokeWeight(isTarget ? 7 : 3);
  }
}

/* 视野适配到整个行程 */
function fitToItinerary() {
  if (!state.itinerary) return;
  var pts = [];
  if (state.home && state.home.lng && state.home.lat) {
    pts.push(state.home);
  }
  for (var d = 0; d < state.itinerary.days.length; d++) {
    var day = state.itinerary.days[d];
    for (var s = 0; s < day.steps.length; s++) {
      if (day.steps[s].place && day.steps[s].place.lng && day.steps[s].place.lat) {
        pts.push(day.steps[s].place);
      }
    }
  }
  fitMapToPoints(pts);
  /* 恢复所有路线正常透明度 */
  for (var i = 0; i < state.routeLines.length; i++) {
    state.routeLines[i].line.setStrokeOpacity(0.85);
    state.routeLines[i].line.setStrokeWeight(5);
  }
}

/* 显隐路线 */
function toggleRouteVisible() {
  state.routeVisible = !state.routeVisible;
  for (var i = 0; i < state.routeLines.length; i++) {
    if (state.routeVisible) state.routeLines[i].line.show();
    else state.routeLines[i].line.hide();
  }
  var btn = document.getElementById("routeToggleBtn");
  if (btn) btn.textContent = state.routeVisible ? "🙈 隐藏路线" : "👀 显示路线";
}

/* ==================== 导出 ==================== */
function exportItinerary() {
  if (!state.itinerary) return;
  var it = state.itinerary;
  var txt = "========== 多日旅游行程规划 ==========\n\n";
  txt += "城市: " + (it.settings.city || "") + "\n";
  txt += "出发日期: " + it.startDate + "\n";
  txt += "旅行天数: " + it.days.length + " 天\n";
  txt += "每日时间: " + it.settings.dayStart + " - " + it.settings.dayEnd + "\n";
  txt += "出行方式: " + getTransportLabel(it.settings.transport) + "\n";
  if (it.settings.pace) {
    var pn = {relax: "轻松", normal: "适中", packed: "紧凑"}[it.settings.pace];
    txt += "旅行节奏: " + pn + "\n";
  }
  if (it.settings.home) txt += "住址/酒店: " + it.settings.home + "\n";
  txt += "\n";

  for (var d = 0; d < it.days.length; d++) {
    var day = it.days[d];
    txt += "--- 第" + day.day + "天 (" + day.date + (day.weather ? " " + weatherDesc(day.weather) : "") + ") ---\n";
    for (var s = 0; s < day.steps.length; s++) {
      var step = day.steps[s];
      if (step.type === "transit") {
        txt += "   " + (step.mode ? getTransportIcon(step.mode) : "🚗") + " " + step.name + " | " + step.time + "\n";
      } else if (step.type === "start") {
        txt += "🚀 " + step.name + " | " + step.time + "\n";
      } else if (step.type === "end") {
        txt += "🏁 " + step.name + " | " + step.time + "\n";
      } else {
        txt += "  " + (step.type === "food" ? "🍜" : "📍") + " " + step.name + " | " + step.time + " | " + step.detail + "\n";
      }
    }
    txt += "\n";
  }
  var bud = estimateBudget(it);
  txt += "预计花费(单人估算): 交通 ¥" + bud.traffic + " + 门票 ¥" + bud.ticket + " + 美食 ¥" + bud.food + " = ¥" + bud.total + "\n";
  txt += "====================================\n";
  txt += "由 多日旅游行程规划系统 生成\n";

  var blob = new Blob([txt], {type: "text/plain;charset=utf-8"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "旅游行程_" + it.startDate + ".txt";
  a.click();
  URL.revokeObjectURL(url);
  showToast("📋 行程已导出");
}

/* ==================== POI 详情弹窗 ==================== */
function showPoiDetail(poi) {
  if (!poi) return;
  document.getElementById("detailOverlay").style.display = "flex";
  var isFood = poi.type === "food";
  var icon = isFood ? "🍜" : "🏛️";
  var typeLabel = isFood ? "美食" : "景点";
  var typeClass = isFood ? "food" : "scenic";
  document.getElementById("detailIcon").className = "detail-icon " + typeClass;
  document.getElementById("detailIcon").textContent = icon;
  document.getElementById("detailName").textContent = poi.name;
  document.getElementById("detailBadge").className = "detail-badge " + typeClass;
  document.getElementById("detailBadge").textContent = typeLabel;

  renderBasicDetail(poi);
}

function closePoiDetail() {
  document.getElementById("detailOverlay").style.display = "none";
}

function renderBasicDetail(poi) {
  var body = document.getElementById("detailBody");
  var isFood = poi.type === "food";
  var r = Math.round((parseFloat(poi.rating) || 4) * 10) / 10;
  var starsHtml = "";
  for (var i = 0; i < Math.min(Math.round(r), 5); i++) starsHtml += "⭐";
  if (r > 0) starsHtml += ' <span style="font-size:12px;color:#999;font-weight:400;">' + r.toFixed(1) + ' 分</span>';

  /* 分类标签：兼容字符串或 {name} 对象两种结构 */
  var tagList = [];
  if (poi.tags) {
    for (var i = 0; i < poi.tags.length; i++) {
      var t = poi.tags[i];
      var name = (typeof t === "string") ? t : (t && t.name);
      if (name && tagList.indexOf(name) < 0) tagList.push(name);
    }
  }
  var tagsHtml = "";
  if (tagList.length > 0) {
    tagsHtml = '<div class="detail-section"><div class="detail-section-title">分类</div><div class="detail-tags">';
    for (var i = 0; i < tagList.length; i++) tagsHtml += '<span class="detail-tag">' + tagList[i] + '</span>';
    tagsHtml += '</div></div>';
  }

  /* 是否已在"已选"列表中 */
  var isSelected = false;
  for (var i = 0; i < state.selected.length; i++) {
    if (state.selected[i].id === poi.id) { isSelected = true; break; }
  }

  body.innerHTML =
    '<div class="detail-rating-box">' +
      '<div class="detail-rating-left">' +
        '<div class="num">' + r.toFixed(1) + '</div>' +
        '<div class="label">评分</div>' +
      '</div>' +
      '<div class="detail-rating-right">' +
        '<div class="stars">' + starsHtml + '</div>' +
        '<div style="font-size:12px;color:#999;margin-top:3px;">' + (isSelected ? "✅ 已加入行程备选" : "✨ 本地推荐数据") + '</div>' +
      '</div>' +
    '</div>' +
    tagsHtml +
    '<div class="detail-section"><div class="detail-section-title">位置</div>' +
      '<div class="detail-address">📍 ' + (poi.addr || "暂无地址") + '</div>' +
      ((poi.lat != null && poi.lng != null)
        ? '<div class="detail-info-row"><span class="label">坐标</span><span>🧭 ' + poi.lat.toFixed(4) + ', ' + poi.lng.toFixed(4) + '</span></div>'
        : '') +
    '</div>' +
    '<div class="detail-links">' +
      '<a class="detail-link-btn primary" href="https://map.baidu.com/search/' + encodeURIComponent(poi.name) + '" target="_blank">' +
        '📍 在百度地图中查看<span class="small">查看周边环境与线路</span></a>' +
      '<button class="detail-link-btn secondary" onclick="closePoiDetail()">关闭</button>' +
    '</div>';
}

/* ==================== 初始化 ==================== */
document.addEventListener("DOMContentLoaded", function() {
  loadState();
  initCities();
  updateHomeUI();

  var today = new Date();
  document.getElementById("startDate").value = today.toISOString().slice(0, 10);

  if (state.city) {
    refreshCityBar();
  }

  /* 百度地图 JS API 加载完成后由回调触发 _mapInit */
  if (typeof BMap !== "undefined") {
    window._mapInit();
  } else {
    var checkMap = setInterval(function() {
      if (typeof BMap !== "undefined") {
        clearInterval(checkMap);
        window._mapInit();
      }
    }, 300);
  }
});
