# Graph Report - airclass  (2026-11-10)

## Corpus Check
- Corpus is ~16,635 words - fits in a single context window. You may not need a graph.

## Summary
- 450 nodes · 854 edges · 30 communities (23 shown, 7 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Screens & API
- Web Pages & API
- Expo Config & Deps
- Web Build Deps
- Project Rules & Guidelines
- Shared Rules Engine
- Expo app.json
- App Screens Slide
- Dummy Data Model
- Web Dashboard Design
- App Home 3-State Slide
- Web Monitoring Design
- Web Room Detail Design
- App Home Outdoor-Bad
- App Settings Design
- Web Device Control Design
- App Control Design
- App Home CO2-High
- App Home Normal
- App Forecast Design
- WindowArt Animation
- Oxlint Config
- App Icon
- Android Icon Foreground
- App Favicon
- Vite Default Favicon
- Android Monochrome Icon
- Splash Icon
- App Data Imports
- Web Data Imports

## God Nodes (most connected - your core abstractions)
1. `T()` - 19 edges
2. `Home()` - 16 edges
3. `useAnimatedTo()` - 16 edges
4. `Control()` - 13 edges
5. `expo` - 12 edges
6. `Dashboard()` - 12 edges
7. `Monitoring()` - 12 edges
8. `react-native` - 11 edges
9. `PressScale()` - 11 edges
10. `Header()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Expo Router Navigation (src/app)` --conceptually_related_to--> `Tech Stack (React+Vite web, Expo app, recharts, lucide)`  [INFERRED]
  app/AGENTS.md → CLAUDE.md
- `React + Vite Template README` --conceptually_related_to--> `Tech Stack (React+Vite web, Expo app, recharts, lucide)`  [INFERRED]
  web/README.md → CLAUDE.md
- `AirClass Admin HTML Entry (loads /src/main.jsx)` --conceptually_related_to--> `Admin Web Screens (dashboard, monitoring, device, room)`  [INFERRED]
  web/index.html → CLAUDE.md
- `getRoomView()` --calls--> `decide()`  [EXTRACTED]
  app/src/api.js → shared/rules.js
- `getRoomView()` --calls--> `judgeRoom()`  [EXTRACTED]
  app/src/api.js → shared/rules.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AirClass auto-control policy** — claude_status_thresholds, claude_auto_control_rules, claude_pickoutdoorpm_fallback, claude_manual_mode_skip, claude_no_auto_window, readme_unknown_outdoor_as_bad [INFERRED 0.85]
- **Dummy-data to FastAPI backend swap path** — claude_shared_data_layer, claude_api_js_single_access_point, readme_fastapi_raspberry_pi_backend, readme_system_architecture [INFERRED 0.85]
- **Air purifier fan speed control (toggle + gauge + segmented selector)** — docs_app_control_air_purifier_card, docs_app_control_circular_fan_gauge, docs_app_control_fan_speed_segmented_control [INFERRED 0.85]
- **Automation toggle list (shared switch component)** — docs_app_control_auto_control_mode_toggle, docs_app_control_ventilation_alert_toggle, docs_app_control_toggle_switch [INFERRED 0.85]
- **Forecast-driven pre-ventilation alert flow** — docs_app_forecast_hourly_pm25_bar_chart, docs_app_forecast_bad_threshold_36, docs_app_forecast_pre_ventilation_banner, docs_app_forecast_alert_list [INFERRED 0.85]
- **CO2 high -> ventilation recommendation display flow** — docs_app_home_co2_orange_status_hero, docs_app_home_co2_window_illustration, docs_app_home_co2_ventilation_guidance, docs_app_home_co2_metric_cards_grid [INFERRED 0.85]
- **Normal-state status display (hero, window, metric cards, badges)** — docs_app_home_normal_status_hero, docs_app_home_normal_window_illustration, docs_app_home_normal_metric_cards_2x2, docs_app_home_normal_status_badge [INFERRED 0.85]
- **Outdoor-bad ventilation restriction flow** — docs_app_home_outdoor_auto_rule_3, docs_app_home_outdoor_window_illustration, docs_app_home_outdoor_ventilation_restricted_message, docs_app_home_outdoor_close_window_toast [INFERRED 0.85]
- **Status judgment thresholds (mirrors shared/rules.js)** — docs_app_settings_indoor_pm25_threshold, docs_app_settings_co2_threshold, docs_app_settings_outdoor_pm25_threshold [INFERRED 0.85]
- **App Home Status States** — docs_slide_app_home_3states_normal_state, docs_slide_app_home_3states_co2_high_state, docs_slide_app_home_3states_outdoor_bad_state, docs_slide_app_home_3states_status_hero [EXTRACTED 1.00]
- **App Home Layout Components** — docs_slide_app_home_3states_classroom_selector, docs_slide_app_home_3states_window_illustration, docs_slide_app_home_3states_metric_cards_2x2, docs_slide_app_home_3states_floating_tab_bar [EXTRACTED 1.00]
- **App tab navigation across control, forecast and settings screens** — docs_slide_app_screens_floating_tab_bar, docs_slide_app_screens_device_control_screen, docs_slide_app_screens_forecast_alerts_screen, docs_slide_app_screens_settings_screen [EXTRACTED 1.00]
- **Outdoor forecast to pre-ventilation alert flow (rule 4, out of scope)** — docs_slide_app_screens_hourly_outdoor_pm25_chart, docs_slide_app_screens_pre_ventilation_warning_banner, docs_slide_app_screens_alert_list, docs_slide_app_screens_alert_thresholds [INFERRED 0.85]
- **Demo scenario updates summary, cards and alerts** — docs_web_dashboard_demo_scenario_buttons, docs_web_dashboard_summary_cards, docs_web_dashboard_classroom_card, docs_web_dashboard_realtime_alerts [EXTRACTED 1.00]
- **Rule-driven status display** — docs_web_dashboard_auto_control_rules, docs_web_dashboard_status_badge, docs_web_dashboard_ventilation_judgment, docs_web_dashboard_realtime_alerts [INFERRED 0.85]
- **Device control flow: bulk control, purifier list, rules, log** — docs_web_device_bulk_control_3_steps, docs_web_device_air_purifier_list, docs_web_device_auto_control_rules_panel, docs_web_device_recent_control_log [INFERRED 0.85]
- **Room status flagging: thresholds -> badges -> attention cards -> table** — docs_web_monitoring_status_threshold_rules, docs_web_monitoring_status_badge, docs_web_monitoring_attention_needed_cards, docs_web_monitoring_classroom_table [INFERRED 0.85]
- **Automation audit trail: readings -> rules -> device actions** — docs_web_room_live_metrics, docs_web_room_applied_rules_log, docs_web_room_device_control_history, docs_web_room_auto_vs_manual_mode [INFERRED 0.85]

## Communities (30 total, 7 thin omitted)

### Community 0 - "App Screens & API"
Cohesion: 0.09
Nodes (57): getRoom(), AnimatedCircle, Control(), s, ToggleRow(), AnimatedRect, AnimatedText, Bar() (+49 more)

### Community 1 - "Web Pages & API"
Cohesion: 0.11
Nodes (37): lucide-react, react-router-dom, lucide-react@^1.70.0, App(), Placeholder(), COLORS, fmt(), REDUCED (+29 more)

### Community 2 - "Expo Config & Deps"
Cohesion: 0.06
Nodes (37): config, { getDefaultConfig }, path, dependencies, expo@~58.0.23, expo-constants@~58.0.15, expo-font@~58.0.11, expo-linking@~58.0.16 (+29 more)

### Community 3 - "Web Build Deps"
Cohesion: 0.08
Nodes (31): oxlint, recharts, @types/react, @types/react-dom, vite, @vitejs/plugin-react, wanted-sans, dependencies (+23 more)

### Community 4 - "Project Rules & Guidelines"
Cohesion: 0.07
Nodes (26): EAS Build/Submit/Update, Expo App Agent Guidelines, Expo Router Navigation (src/app), SIL Open Font License 1.1 (Wanted Sans), AirClass Project Rules (CLAUDE.md), Auto Control Rules 1,2,3,5, Demo Scenario Buttons, Design Tokens (primary #3a70fc, ok/warn/bad) (+18 more)

### Community 5 - "Shared Rules Engine"
Cohesion: 0.17
Nodes (13): getPurifier(), getRoomView(), applyScenario(), decide(), judgeRoom(), outdoorStatus(), pickOutdoorPm(), summarize() (+5 more)

### Community 6 - "Expo app.json"
Cohesion: 0.11
Nodes (18): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, expo, android, icon, ios (+10 more)

### Community 7 - "App Screens Slide"
Cohesion: 0.17
Nodes (17): Teacher Account Card (이지은 선생님), AirClass Logo Header with Notification Bell, Alert History List (사전 환기 권장, CO2 환기 필요, 공기청정기 자동 가동 완료), Alert Thresholds (실내 PM2.5 35, CO2 1000, 실외 PM2.5 36, 사전 환기 2시간 전), App Screens Slide (Control / Forecast / Settings), Auto Control Mode Toggle (자동 제어 모드), Circular Air Purifier Gauge (가동 중 / 풍량 단계), App Device Control Screen (장치 제어) (+9 more)

### Community 8 - "Dummy Data Model"
Cohesion: 0.12
Nodes (15): alerts, appHomeStates, controlLog, currentAdmin, currentTeacher, FLOORS, outdoor, purifiers (+7 more)

### Community 9 - "Web Dashboard Design"
Cohesion: 0.26
Nodes (11): Web Main Dashboard Design (web_dashboard.png), Bulk Control Button (일괄 제어) + Building Selector, Classroom Card, Classroom Status Map (Floor Layout), Demo Scenario Buttons (시연용 시나리오), Outdoor PM2.5 Forecast Chart, Realtime Alerts List, Selected Room Detail Panel (+3 more)

### Community 10 - "App Home 3-State Slide"
Cohesion: 0.20
Nodes (11): App Home 3-State Slide, Classroom Selector Pill, CO2 High State (Orange Hero), CO2 Threshold 1,000ppm, Floating Rounded Tab Bar, Forecast Pre-Ventilation Banner, Metric Cards 2x2, Normal State (Blue Hero) (+3 more)

### Community 11 - "Web Monitoring Design"
Cohesion: 0.23
Nodes (11): Air Purifier State Column (가동 중/대기), 확인 필요 교실 카드 (Attention-Needed Room Cards), 교실별 모니터링 화면 (Classroom Monitoring Screen), 24-Room Sortable Classroom Table, 최근 6시간 CO2 Sparkline, CSV로 내려받기 Button, Inline PM2.5/CO2 Value Bars, 상세 보기 Link to Room Detail (+3 more)

### Community 12 - "Web Room Detail Design"
Cohesion: 0.23
Nodes (12): 24-Hour Trend Chart (CO2/PM2.5 tabs), Applied Control Rules Log (적용된 제어 규칙), Auto vs Manual Control Mode, Ventilation Threshold Line 1,000ppm, Device Control History Table (장치 제어 이력), Live Metrics Row (PM2.5, CO2, 온도, 습도), Web Room Detail Screen (교실 상세), Room Header with Status Badge (+4 more)

### Community 13 - "App Home Outdoor-Bad"
Cohesion: 0.24
Nodes (10): App Home - Outdoor Bad State Screen, Classroom Selector (2학년 2반 본관 2층), Close Window Toast (창문을 닫아 주세요), Floating Rounded Tab Bar (홈/제어/예측·알림/설정), Metric Cards 2x2 (CO2, PM2.5, Temp, Humidity), Navy Status Hero (Outdoor Bad), Notification Bell with Unread Dot, Status Badge (환기 필요 / 양호 / 나쁨) (+2 more)

### Community 14 - "App Settings Design"
Cohesion: 0.20
Nodes (11): Account Profile Card, Alert Thresholds (알림 기준값), AirClass Logo Header with Notification Bell, CO2 >= 1,000ppm ventilate, Default Classroom Badge (기본 교실), Floating Rounded Tab Bar, Indoor PM2.5 >= 35 bad, My Classroom Management (내 교실 관리) (+3 more)

### Community 15 - "Web Device Control Design"
Cohesion: 0.27
Nodes (8): Admin Sidebar Navigation, Air Purifier List Table (모드·풍량·전원·필터 수명), Auto Control Rules Toggles (자동 제어 규칙 1-5), Device Control Screen (장치 제어), Device Status Summary (가동/대기/수동/연결 끊김), Recent Control Log (최근 제어 기록), Reset All Devices to Auto Mode Button, Rule 4: ML Outdoor PM Forecast Pre-ventilation

### Community 16 - "App Control Design"
Cohesion: 0.36
Nodes (9): Air Purifier Card (공기청정기 power toggle, 자동 제어로 가동 중), App Device Control Screen (장치 제어), App Header (AirClass logo, classroom 2학년 2반, notification bell), Auto Control Mode Toggle (자동 제어 모드), Circular Fan Speed Gauge (풍량 2단계 / 중), Fan Speed Segmented Control (약/중/강/터보), Floating Rounded Tab Bar (홈/제어/예측·알림/설정), Toggle Switch Component (shared) (+1 more)

### Community 17 - "App Home CO2-High"
Cohesion: 0.31
Nodes (9): App Home - CO2 High State, Classroom Selector (2학년 2반 본관 2층), Floating Rounded Tab Bar (홈/제어/예측·알림/설정), Metric Cards 2x2 (CO2, PM2.5, Temp, Humidity), Notification Bell with Unread Dot, Orange Status Hero (주의, CO2 높음), Proactive Ventilation Forecast Banner, Ventilation Guidance Message (환기가 필요해요) (+1 more)

### Community 18 - "App Home Normal"
Cohesion: 0.28
Nodes (8): App Home Screen (Normal State), Classroom Selector (2학년 2반 본관 2층), Floating Rounded Tab Bar, Metric Cards 2x2 (CO2, PM2.5, Temp, Humidity), Notification Bell with Unread Dot, Status Badge (양호/보통), Status-Colored Hero (Normal Blue), Window Illustration with Indoor CO2 / Outdoor PM2.5

### Community 19 - "App Forecast Design"
Cohesion: 0.36
Nodes (7): App Forecast & Alerts Screen (예측과 알림), AirClass Logo Header + Notification Bell, Alert List (사전 환기 권장 / CO2 환기 필요 / 공기청정기 자동 가동 완료), Outdoor Bad Threshold Line (나쁨 36), Floating Rounded Tab Bar (홈/제어/예측·알림/설정), Hourly Outdoor PM2.5 Bar Chart (시간대별 실외 PM2.5), Pre-ventilation Warning Banner (2시간 뒤 실외 나쁨 예상)

### Community 20 - "WindowArt Animation"
Cohesion: 0.48
Nodes (6): linear(), pingPong(), s, Sash(), useLoop(), WindowArt()

### Community 21 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 22 - "App Icon"
Cohesion: 1.00
Nodes (3): AirClass App Icon (white wind lines on blue), Primary Blue Background (#3a70fc-like brand color), Wind Glyph (airflow symbol)

## Ambiguous Edges - Review These
- `Android Adaptive Icon Foreground` → `Expo Template Default Icon Asset`  [AMBIGUOUS]
  app/assets/android-icon-foreground.png · relation: conceptually_related_to

## Knowledge Gaps
- **60 isolated node(s):** `{ school, currentTeacher, outdoor, SPEEDS, appHomeStates, controlLog }`, `{ school, currentAdmin, FLOORS, SPEEDS, scenarios, controlLog, RULES, historyFor }`, `Expo metro.config watchFolders for shared/`, `Status Judgment Thresholds (PM2.5>=35, CO2>=1000, outdoor>=36)`, `Manual Mode Devices Skip Auto Rules` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 152 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `Web Pages & API` to `Web Build Deps`, `Shared Rules Engine`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `{ school, currentTeacher, outdoor, SPEEDS, appHomeStates, controlLog }`, `{ school, currentAdmin, FLOORS, SPEEDS, scenarios, controlLog, RULES, historyFor }`, `Expo metro.config watchFolders for shared/` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Screens & API` be split into smaller, more focused modules?**
  _Cohesion score 0.09272300469483569 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Web Pages & API` to `Web Build Deps`, `Shared Rules Engine`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Web Pages & API` be split into smaller, more focused modules?**
  _Cohesion score 0.11180992313067785 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `App Screens & API` to `Expo Config & Deps`, `WindowArt Animation`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Android Adaptive Icon Foreground` and `Expo Template Default Icon Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._