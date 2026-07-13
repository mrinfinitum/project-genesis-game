# Roblox HUD Asset Fidelity v7

Source of truth:
- Roblox Rojo project: `/Users/geofftracy/Projects/neo-city-tycoon/Roblox`
- Export manifest: `/Users/geofftracy/Projects/neo-city-tycoon/Roblox/art-export/roblox-art-manifest.json`
- Reference screenshot: `public/design-reference/roblox/dashboard/dashboard-main-1920.png`
- Vite registry: `src/lib/canonical-runtime/dashboard-art.ts`

## Adopted HUD Assets

| HUD region | Roblox key | Asset ID | Source file | Native size | Vite registry key | Fidelity status |
| --- | --- | --- | --- | --- | --- | --- |
| Full background | `dashboard_background` | `120850482047860` | `assets/UI/hud_background_1920x1080.png` | 1920x1080 | `dashboard_background` | Exact bitmap |
| Top HUD strip | `top_bar_resource_panel_strip` | `81516206378414` | `assets/topbar/topbar_resource_panel_1920x104a.png` | 1920x104 | `dashboard_top_hud` | Exact bitmap |
| Top plus button | `top_bar_plus_button` | `82799868570489` | `assets/topbar/topbar_plus_button_56x56.png` | 56x56 | `topbar_plus_button` | Exact bitmap |
| Top hex button | `top_bar_hex_button` | `120486747670611` | `assets/topbar/topbar_hex_button_80x80.png` | 96x96 | `topbar_hex_button` | Exact bitmap |
| Credits icon | `credits_icon` | `87083558682098` | `assets/topbar/icon_credits_coin_96x96.png` | 96x96 | `hud_credits_icon` | Exact bitmap |
| Research icon | `research_icon` | `111861373961333` | `assets/topbar/icon_research_flask_96x96.png` | 96x96 | `hud_research_icon` | Exact bitmap |
| Population icon | `population_icon` | `85080367725697` | `assets/topbar/icon_population_96x96.png` | 96x96 | `hud_population_icon` | Exact bitmap |
| Energy icon | `civilization_energy_icon` | `117874545529859` | `assets/topbar/icon_civilization_energy_96x96.png` | 96x96 | `hud_energy_icon` | Exact bitmap |
| Civilization points icon | `civilization_points_icon` | `85260889782155` | `assets/topbar/icon_civilization_points_crystal_96x96.png` | 96x96 | `hud_civilization_points_icon` | Exact bitmap |
| Calendar icon | `calendar_icon` | `124831656845168` | `assets/topbar/icon_calendar_80x80.png` | 80x80 | `topbar_calendar_icon` | Exact bitmap |
| Trophy icon | `trophy_icon` | `136305496385375` | `assets/topbar/icon_trophy_80x80.png` | 80x80 | `topbar_trophy_icon` | Exact bitmap |
| Settings icon | `settings_icon` | `134568742596537` | `assets/topbar/icon_settings_80x80.png` | 80x80 | `topbar_settings_icon` | Exact bitmap |
| Sidebar rail | `sidebar_frame` / `ui_panel_side_menu.png` alias | `133332255744133` | `assets/UI/sidebar_frame_160x790.png` | 160x790 | `dashboard_nav_background` | Exact bitmap rendered once, stretched to Rojo frame |
| Overview nav icon | `overview` | `90083002972176` | `assets/menu/icon_overview_96x96.png` | 96x96 | `nav_overview_icon` | Exact bitmap |
| Production nav icon | `buildings` | `110776348182971` | `assets/menu/icon_buildings_96x96.png` | 96x96 | `nav_production_icon` | Exact bitmap |
| Research nav icon | `research_icon` | `79646906444906` | `assets/menu/icon_research_96x96.png` | 96x96 | `nav_research_icon` | Exact bitmap |
| Resources nav icon | `spaceport` | `94102733730670` | `assets/menu/icon_spaceport_96x96.png` | 96x96 | `nav_resources_icon` | Exact bitmap |
| Civilization nav icon | `events` | `100669893038463` | `assets/menu/icon_events_96x96.png` | 96x96 | `nav_civilization_icon` | Exact bitmap |
| Solar nav icon | `galaxy` | `131105457776060` | `assets/menu/icon_galaxy_96x96.png` | 96x96 | `nav_galaxy_icon` | Exact bitmap |
| Integrated clicker HUD | `clicker_hud_background` | `76675288800216` | `assets/UI/hud_clicker_350x823.png` | 350x780 manifest, 350x823 Rojo placement | `dashboard_click_panel_background` | Exact bitmap rendered once |
| Click outer ring | `click_ring_outer` | `105751787246060` | `assets/UI/click-interface-circle-outer.png` | 432x432 | `click_ring_outer` | Exact bitmap |
| Click middle ring | `click_ring_middle` | `101968959721215` | `assets/UI/click-interface-circle-middle.png` | 432x432 | `click_ring_middle` | Exact bitmap |
| Click inner ring | `click_ring_inner` | `111306940360008` | `assets/UI/click-interface-circle-inner.png` | 432x432 | `click_ring_inner` | Exact bitmap |
| Click hand | `click_hand_icon` | `70836319761875` | `assets/UI/click-interface-hand-256.png` | 256x256 | `click_hand_icon` | Exact bitmap |
| Click button | `click_button` | `97243708870036` | `assets/buttons/click_button-main.png` | 329x81 | `dashboard_click_button` | Exact bitmap |
| Click tapped button | `click_button_tapped` | `119403047246277` | `assets/buttons/click_button-hover.png` | 329x81 | `dashboard_click_button_tapped` | Exact bitmap |
| Auto outer ring | `auto_robot_circle` | `117040601543803` | `assets/UI/click-robot-circle-outer.png` | 432x432 | `auto_robot_circle` | Exact bitmap |
| Auto robot open | `auto_robot_icon` | `72298597001681` | `assets/UI/click-robot-eyes-open.png` | 432x432 | `auto_robot_icon` | Exact bitmap |
| Auto robot blink | `auto_robot_blink_icon` | `76501991568176` | `assets/UI/click-robot-eyes-blink.png` | 432x432 | `auto_robot_blink_icon` | Exact bitmap |
| Auto on button | `auto_button_on` | `139841618767256` | `assets/buttons/click_auto_on.png` | 329x62 | `dashboard_auto_button_on` | Exact bitmap |
| Auto off button | `auto_button_off` | `106944699002340` | `assets/buttons/click_auto_off.png` | 329x62 | `dashboard_auto_button_off` | Exact bitmap |
| Critical star | `critical_star_icon` | `84002014642489` | `assets/UI/critical-star-96x96.png` | 96x96 | `critical_star_icon` | Exact bitmap |
| Hero city preview | `city_preview` | `140425686512251` | `assets/UI/cityimage-1.png` | 910x517 | `dashboard_city_preview` | Exact bitmap |
| Objective panel | `objective_panel` | `139560217216021` | `assets/UI/objective-351x105.png` | 351x105 | `dashboard_objective_panel` | Exact bitmap |
| Upgrade panel | `upgrade_panel_structure` | `137465475952770` | `assets/UI/folder-tabs-base-920.png` | 920x420 | `dashboard_upgrade_panel_background` | Exact bitmap |
| Upgrade button | `upgrade_button` | `118768043950365` | `assets/UI/upgrade-button-primary.png` | 310x94 | `dashboard_upgrade_button` | Exact bitmap |
| Leaderboard panel | `leaderboard_panel` | `130675384010731` | `assets/UI/leaderboard-main.png` | 852x606 | `dashboard_leaderboard_panel` | Exact bitmap |
| Event panel | `active_event_panel` | `88733035792020` | `assets/UI/current-event.png` | 1005x510 | `dashboard_event_panel` | Exact bitmap |
| Event sub layer | `active_event_sub_layer` | `75304753948939` | `assets/UI/event-layer-2.png` | 390x149 | `dashboard_event_sub_layer` | Exact bitmap |
| Event activate button | `event_activate_button` | `136020107961949` | `assets/buttons/event-button.png` | 358x53 | `dashboard_event_button` | Exact bitmap |
| Alignment panel | `alignment_panel` | `133827934088512` | `assets/UI/alignment-background.png` | 1000x929 | `dashboard_alignment_panel` | Exact bitmap |

## CSS Recreation Removed Or Reduced

- Inactive left navigation items no longer render independent cyan/white card borders, dark rectangular card fills, rounded corners, shadows, or icon frames. They sit transparent over the exported continuous `ui_panel_side_menu.png` rail.
- The click, auto, and critical regions now share one rendered `hud_clicker_350x823.png` background. Vite does not render separate auto/critical panel background images over it.
- Click and auto action buttons use the exact exported button images when registry mappings resolve; CSS bevels remain only as missing-asset fallback.
- The critical stats region no longer renders the extra `Next Milestone` label in the Vite HUD.

## Runtime-Generated Or Missing Exact Web Assets

| Area | Missing/Generated item | Current handling |
| --- | --- | --- |
| Left navigation item states | Individual active/inactive item backgrounds are runtime-created Rojo frames, not exported bitmaps | No CSS active or inactive frame is rendered; hit targets are transparent over the rail art until exact state art is exported |
| Help icons | Rojo uses text/generated help treatment | Vite keeps a semantic fallback button unless a future exported bitmap appears |
| Boost drawer and launcher | No exact exported drawer/launcher background found in manifest | Vite preserves the Roblox-style generated bottom drawer until source art is exported |
| Click interface generic circle | Manifest key exists without local source or native size | Vite uses the resolved ring layers that do have web-compatible files |
| Civilization crest | Manifest references `rbxassetid://0` | Vite uses the mapped fallback registry behavior |

## Parity Status

Status: In Progress.

The primary HUD now uses exported source bitmaps for visible backgrounds and controls where the manifest provides them. Remaining mismatches require either Roblox Studio screenshot confirmation or new exported web-compatible assets for generated state chrome, boosts, help affordances, and any missing button-hover variants.
