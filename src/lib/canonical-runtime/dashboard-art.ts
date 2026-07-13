import type { AssetDefinition } from "./types";

export type DashboardArtSourceStatus = "mapped" | "source-missing" | "replacement-required";

export type DashboardArtRegistryEntry = {
  key: string;
  label: string;
  viteUsage: string;
  artKey?: string;
  iconKey?: string;
  robloxAssetId?: string;
  localPath?: string;
  sourceStatus: DashboardArtSourceStatus;
  notes?: string;
};

export type DashboardArtResolution = DashboardArtRegistryEntry & {
  kind: "web-path" | "local-registry" | "placeholder";
  path?: string;
  canonicalAssetId?: string;
  platformWebPath?: string;
  mappingStatus: "canonical-web" | "local-fallback" | "missing";
  warnings: string[];
};

export const DASHBOARD_ART_REGISTRY = {
  dashboard_background: {
    key: "dashboard_background",
    label: "Dashboard background",
    viteUsage: "GameShell background",
    artKey: "dashboard_background",
    robloxAssetId: "120850482047860",
    localPath: "/roblox-assets/UI/hud_background_1920x1080.png",
    sourceStatus: "mapped"
  },
  dashboard_top_hud: {
    key: "dashboard_top_hud",
    label: "Top HUD resource strip",
    viteUsage: "RobloxTopHud shell",
    artKey: "top_bar_resource_panel_strip",
    robloxAssetId: "81516206378414",
    localPath: "/roblox-assets/topbar/topbar_resource_panel_1920x104a.png",
    sourceStatus: "mapped"
  },
  civilization_crest: {
    key: "civilization_crest",
    label: "Civilization crest",
    viteUsage: "Top HUD identity",
    artKey: "planet_prime_icon",
    robloxAssetId: "0",
    localPath: "/roblox-assets/topbar/icon_civilization_points_crystal_96x96.png",
    sourceStatus: "replacement-required",
    notes: "Roblox TopBarAssetManifest PlanetPrimeIcon is rbxassetid://0; local crystal icon is a documented fallback."
  },
  topbar_plus_button: {
    key: "topbar_plus_button",
    label: "Topbar plus button",
    viteUsage: "Top HUD add resource button",
    artKey: "top_bar_plus_button",
    robloxAssetId: "82799868570489",
    localPath: "/roblox-assets/topbar/topbar_plus_button_56x56.png",
    sourceStatus: "mapped"
  },
  topbar_hex_button: {
    key: "topbar_hex_button",
    label: "Topbar hex utility button",
    viteUsage: "Top HUD calendar/trophy/settings buttons",
    artKey: "top_bar_hex_button",
    robloxAssetId: "120486747670611",
    localPath: "/roblox-assets/topbar/topbar_hex_button_80x80.png",
    sourceStatus: "mapped"
  },
  topbar_calendar_icon: {
    key: "topbar_calendar_icon",
    label: "Calendar icon",
    viteUsage: "Top HUD utility icon",
    artKey: "calendar_icon",
    robloxAssetId: "124831656845168",
    localPath: "/roblox-assets/topbar/icon_calendar_80x80.png",
    sourceStatus: "mapped"
  },
  topbar_trophy_icon: {
    key: "topbar_trophy_icon",
    label: "Trophy icon",
    viteUsage: "Top HUD utility icon",
    artKey: "trophy_icon",
    robloxAssetId: "136305496385375",
    localPath: "/roblox-assets/topbar/icon_trophy_80x80.png",
    sourceStatus: "mapped"
  },
  topbar_settings_icon: {
    key: "topbar_settings_icon",
    label: "Settings icon",
    viteUsage: "Top HUD utility icon",
    artKey: "settings_icon",
    robloxAssetId: "134568742596537",
    localPath: "/roblox-assets/topbar/icon_settings_80x80.png",
    sourceStatus: "mapped"
  },
  hud_credits_icon: {
    key: "hud_credits_icon",
    label: "Credits icon",
    viteUsage: "Top HUD resource icon",
    artKey: "credits_icon",
    robloxAssetId: "87083558682098",
    localPath: "/roblox-assets/topbar/icon_credits_coin_96x96.png",
    sourceStatus: "mapped"
  },
  hud_population_icon: {
    key: "hud_population_icon",
    label: "Population icon",
    viteUsage: "Top HUD resource icon",
    artKey: "population_icon",
    robloxAssetId: "85080367725697",
    localPath: "/roblox-assets/topbar/icon_population_96x96.png",
    sourceStatus: "mapped"
  },
  hud_civilization_energy_icon: {
    key: "hud_civilization_energy_icon",
    label: "Civilization energy icon",
    viteUsage: "Top HUD resource icon",
    artKey: "civilization_energy_icon",
    robloxAssetId: "117874545529859",
    localPath: "/roblox-assets/topbar/icon_civilization_energy_96x96.png",
    sourceStatus: "mapped"
  },
  hud_research_icon: {
    key: "hud_research_icon",
    label: "Research icon",
    viteUsage: "Top HUD resource icon",
    artKey: "research_icon",
    robloxAssetId: "111861373961333",
    localPath: "/roblox-assets/topbar/icon_research_flask_96x96.png",
    sourceStatus: "mapped"
  },
  hud_civilization_points_icon: {
    key: "hud_civilization_points_icon",
    label: "Civilization points icon",
    viteUsage: "Top HUD resource icon",
    artKey: "civilization_points_icon",
    robloxAssetId: "85260889782155",
    localPath: "/roblox-assets/topbar/icon_civilization_points_crystal_96x96.png",
    sourceStatus: "mapped"
  },
  sidebar_frame: {
    key: "sidebar_frame",
    label: "Sidebar frame",
    viteUsage: "RobloxNavigation shell",
    artKey: "sidebar_frame",
    robloxAssetId: "133332255744133",
    localPath: "/roblox-assets/UI/sidebar_frame_160x790.png",
    sourceStatus: "mapped"
  },
  dashboard_nav_background: {
    key: "dashboard_nav_background",
    label: "Dashboard navigation background",
    viteUsage: "RobloxNavigation shell",
    artKey: "sidebar_frame",
    robloxAssetId: "133332255744133",
    localPath: "/roblox-assets/UI/sidebar_frame_160x790.png",
    sourceStatus: "mapped"
  },
  navigation_overview_icon: {
    key: "navigation_overview_icon",
    label: "Overview nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "overview_icon",
    robloxAssetId: "79397960883593",
    localPath: "/roblox-assets/menu/icon_overview_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_buildings_icon: {
    key: "navigation_buildings_icon",
    label: "Buildings nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "buildings_icon",
    robloxAssetId: "82915516332061",
    localPath: "/roblox-assets/menu/icon_buildings_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_research_icon: {
    key: "navigation_research_icon",
    label: "Research nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "research_icon",
    robloxAssetId: "79646906444906",
    localPath: "/roblox-assets/menu/icon_research_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_upgrades_icon: {
    key: "navigation_upgrades_icon",
    label: "Upgrades nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "upgrades_icon",
    robloxAssetId: "128289681864521",
    localPath: "/roblox-assets/menu/icon_upgrades_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_civilization_icon: {
    key: "navigation_civilization_icon",
    label: "Civilization nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "civilization_points_icon",
    robloxAssetId: "85260889782155",
    localPath: "/roblox-assets/topbar/icon_civilization_points_crystal_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_events_icon: {
    key: "navigation_events_icon",
    label: "Events nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "events_icon",
    robloxAssetId: "109412483529666",
    localPath: "/roblox-assets/menu/icon_events_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_galaxy_icon: {
    key: "navigation_galaxy_icon",
    label: "Galaxy nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "galaxy_icon",
    robloxAssetId: "92678951819674",
    localPath: "/roblox-assets/menu/icon_galaxy_96x96.png",
    sourceStatus: "mapped"
  },
  navigation_spaceport_icon: {
    key: "navigation_spaceport_icon",
    label: "Spaceport nav icon",
    viteUsage: "Sidebar nav icon",
    artKey: "spaceport_icon",
    robloxAssetId: "105730152289089",
    localPath: "/roblox-assets/menu/icon_spaceports_96x96.png",
    sourceStatus: "mapped"
  },
  clicker_hud_background: {
    key: "clicker_hud_background",
    label: "Clicker HUD background",
    viteUsage: "RobloxLeftColumn shell",
    artKey: "clicker_hud_background",
    robloxAssetId: "76675288800216",
    localPath: "/roblox-assets/UI/hud_clicker_350x823.png",
    sourceStatus: "mapped"
  },
  dashboard_click_panel_background: {
    key: "dashboard_click_panel_background",
    label: "Dashboard click panel background",
    viteUsage: "Click panel background from integrated clicker HUD art",
    artKey: "clicker_hud_background",
    robloxAssetId: "76675288800216",
    localPath: "/roblox-assets/UI/hud_clicker_350x823.png",
    sourceStatus: "mapped",
    notes: "Roblox uses one integrated ClickerHudBackground and removes generated chrome for click, auto, and critical panels."
  },
  dashboard_auto_panel_background: {
    key: "dashboard_auto_panel_background",
    label: "Dashboard auto panel background",
    viteUsage: "Auto panel background from integrated clicker HUD art",
    artKey: "clicker_hud_background",
    robloxAssetId: "76675288800216",
    localPath: "/roblox-assets/UI/hud_clicker_350x823.png",
    sourceStatus: "mapped",
    notes: "Roblox uses one integrated ClickerHudBackground and removes generated chrome for click, auto, and critical panels."
  },
  dashboard_critical_panel_background: {
    key: "dashboard_critical_panel_background",
    label: "Dashboard critical panel background",
    viteUsage: "Critical panel background from integrated clicker HUD art",
    artKey: "clicker_hud_background",
    robloxAssetId: "76675288800216",
    localPath: "/roblox-assets/UI/hud_clicker_350x823.png",
    sourceStatus: "mapped",
    notes: "Roblox uses one integrated ClickerHudBackground and removes generated chrome for click, auto, and critical panels."
  },
  dashboard_click_interface: {
    key: "dashboard_click_interface",
    label: "Click interface circle",
    viteUsage: "Click panel interface fallback status",
    artKey: "click_interface_circle",
    robloxAssetId: "109831483704097",
    sourceStatus: "source-missing",
    notes: "No web-compatible source file exists in the Rojo asset manifest. Layered ring assets remain the visual fallback."
  },
  dashboard_click_ring: {
    key: "dashboard_click_ring",
    label: "Dashboard click ring",
    viteUsage: "Click panel rotating ring",
    artKey: "click_ring_outer",
    robloxAssetId: "105751787246060",
    localPath: "/roblox-assets/UI/click-interface-circle-outer.png",
    sourceStatus: "mapped"
  },
  dashboard_click_hand: {
    key: "dashboard_click_hand",
    label: "Dashboard click hand",
    viteUsage: "Click panel stationary center icon",
    artKey: "click_hand_icon",
    robloxAssetId: "70836319761875",
    localPath: "/roblox-assets/UI/click-interface-hand-256.png",
    sourceStatus: "mapped"
  },
  dashboard_auto_ring: {
    key: "dashboard_auto_ring",
    label: "Dashboard auto ring",
    viteUsage: "Auto panel rotating robot ring",
    artKey: "auto_robot_circle",
    robloxAssetId: "117040601543803",
    localPath: "/roblox-assets/UI/click-robot-circle-outer.png",
    sourceStatus: "mapped"
  },
  dashboard_auto_robot: {
    key: "dashboard_auto_robot",
    label: "Dashboard auto robot",
    viteUsage: "Auto panel stationary center icon",
    artKey: "auto_robot_icon",
    robloxAssetId: "72298597001681",
    localPath: "/roblox-assets/UI/click-robot-eyes-open.png",
    sourceStatus: "mapped"
  },
  dashboard_click_button: {
    key: "dashboard_click_button",
    label: "Dashboard click button",
    viteUsage: "Click panel primary action",
    artKey: "click_button",
    robloxAssetId: "97243708870036",
    localPath: "/roblox-assets/buttons/click_button-main.png",
    sourceStatus: "mapped"
  },
  dashboard_auto_button: {
    key: "dashboard_auto_button",
    label: "Dashboard auto button",
    viteUsage: "Auto panel active toggle action",
    artKey: "auto_button_on",
    robloxAssetId: "139841618767256",
    localPath: "/roblox-assets/buttons/click_auto_on.png",
    sourceStatus: "mapped"
  },
  dashboard_auto_button_on: {
    key: "dashboard_auto_button_on",
    label: "Dashboard auto on button",
    viteUsage: "Auto panel active toggle action",
    artKey: "auto_button_on",
    robloxAssetId: "139841618767256",
    localPath: "/roblox-assets/buttons/click_auto_on.png",
    sourceStatus: "mapped"
  },
  dashboard_auto_button_off: {
    key: "dashboard_auto_button_off",
    label: "Dashboard auto off button",
    viteUsage: "Auto panel inactive toggle action",
    artKey: "auto_button_off",
    robloxAssetId: "106944699002340",
    localPath: "/roblox-assets/buttons/click_auto_off.png",
    sourceStatus: "mapped"
  },
  dashboard_help_icon: {
    key: "dashboard_help_icon",
    label: "Dashboard help icon",
    viteUsage: "Click and auto panel help affordance",
    robloxAssetId: "0",
    sourceStatus: "source-missing",
    notes: "Roblox CityHud renders this affordance as a cyan TextLabel '?' instead of image art."
  },
  click_hand_icon: {
    key: "click_hand_icon",
    label: "Click hand icon",
    viteUsage: "Click panel hand",
    artKey: "click_hand_icon",
    robloxAssetId: "70836319761875",
    localPath: "/roblox-assets/UI/click-interface-hand-256.png",
    sourceStatus: "mapped"
  },
  click_ring_inner: {
    key: "click_ring_inner",
    label: "Click ring inner",
    viteUsage: "Click panel ring",
    artKey: "click_ring_inner",
    robloxAssetId: "111306940360008",
    localPath: "/roblox-assets/UI/click-interface-circle-inner.png",
    sourceStatus: "mapped"
  },
  click_ring_middle: {
    key: "click_ring_middle",
    label: "Click ring middle",
    viteUsage: "Click panel ring",
    artKey: "click_ring_middle",
    robloxAssetId: "101968959721215",
    localPath: "/roblox-assets/UI/click-interface-circle-middle.png",
    sourceStatus: "mapped"
  },
  click_ring_outer: {
    key: "click_ring_outer",
    label: "Click ring outer",
    viteUsage: "Click panel ring",
    artKey: "click_ring_outer",
    robloxAssetId: "105751787246060",
    localPath: "/roblox-assets/UI/click-interface-circle-outer.png",
    sourceStatus: "mapped"
  },
  click_button: {
    key: "click_button",
    label: "Click button",
    viteUsage: "Click panel primary button",
    artKey: "click_button",
    robloxAssetId: "97243708870036",
    localPath: "/roblox-assets/buttons/click_button-main.png",
    sourceStatus: "mapped"
  },
  auto_robot_circle: {
    key: "auto_robot_circle",
    label: "Auto robot circle",
    viteUsage: "Automation panel robot ring",
    artKey: "auto_robot_circle",
    robloxAssetId: "117040601543803",
    localPath: "/roblox-assets/UI/click-robot-circle-outer.png",
    sourceStatus: "mapped"
  },
  auto_robot_icon: {
    key: "auto_robot_icon",
    label: "Auto robot icon",
    viteUsage: "Automation panel robot",
    artKey: "auto_robot_icon",
    robloxAssetId: "72298597001681",
    localPath: "/roblox-assets/UI/click-robot-eyes-open.png",
    sourceStatus: "mapped"
  },
  auto_button_on: {
    key: "auto_button_on",
    label: "Auto on button",
    viteUsage: "Automation panel toggle",
    artKey: "auto_button_on",
    robloxAssetId: "139841618767256",
    localPath: "/roblox-assets/buttons/click_auto_on.png",
    sourceStatus: "mapped"
  },
  auto_button_off: {
    key: "auto_button_off",
    label: "Auto off button",
    viteUsage: "Automation panel toggle",
    artKey: "auto_button_off",
    robloxAssetId: "106944699002340",
    localPath: "/roblox-assets/buttons/click_auto_off.png",
    sourceStatus: "mapped"
  },
  critical_star_icon: {
    key: "critical_star_icon",
    label: "Critical star icon",
    viteUsage: "Critical stats panel icon",
    artKey: "critical_star_icon",
    robloxAssetId: "84002014642489",
    localPath: "/roblox-assets/UI/critical-star-96x96.png",
    sourceStatus: "mapped"
  },
  dashboard_city_hero: {
    key: "dashboard_city_hero",
    label: "City hero",
    viteUsage: "Hero city preview",
    artKey: "city_preview",
    robloxAssetId: "140425686512251",
    localPath: "/roblox-assets/UI/cityimage-1.png",
    sourceStatus: "mapped"
  },
  objective_panel: {
    key: "objective_panel",
    label: "Objective panel",
    viteUsage: "Hero objective overlay",
    artKey: "objective_panel",
    robloxAssetId: "139560217216021",
    localPath: "/roblox-assets/UI/objective-351x105.png",
    sourceStatus: "mapped"
  },
  era_progression_hex: {
    key: "era_progression_hex",
    label: "Era rail hex",
    viteUsage: "Era rail node",
    artKey: "era_progression_hex",
    robloxAssetId: "134713324945792",
    localPath: "/roblox-assets/UI/hex-progression-shape.png",
    sourceStatus: "mapped"
  },
  upgrade_panel_structure: {
    key: "upgrade_panel_structure",
    label: "Upgrade panel structure",
    viteUsage: "Upgrade panel background and tabs",
    artKey: "upgrade_panel_structure",
    robloxAssetId: "137465475952770",
    localPath: "/roblox-assets/UI/folder-tabs-base-920.png",
    sourceStatus: "mapped"
  },
  dashboard_upgrade_background: {
    key: "dashboard_upgrade_background",
    label: "Dashboard upgrade background",
    viteUsage: "Upgrade panel background and tabs",
    artKey: "upgrade_panel_structure",
    robloxAssetId: "137465475952770",
    localPath: "/roblox-assets/UI/folder-tabs-base-920.png",
    sourceStatus: "mapped"
  },
  upgrade_button: {
    key: "upgrade_button",
    label: "Upgrade purchase button",
    viteUsage: "Upgrade row purchase button",
    artKey: "upgrade_button",
    robloxAssetId: "118768043950365",
    localPath: "/roblox-assets/UI/upgrade-button-primary.png",
    sourceStatus: "mapped"
  },
  leaderboard_panel: {
    key: "leaderboard_panel",
    label: "Leaderboard panel",
    viteUsage: "Right column leaderboard",
    artKey: "leaderboard_panel",
    robloxAssetId: "130675384010731",
    localPath: "/roblox-assets/UI/leaderboard-main.png",
    sourceStatus: "mapped"
  },
  dashboard_leaderboard_background: {
    key: "dashboard_leaderboard_background",
    label: "Dashboard leaderboard background",
    viteUsage: "Right column leaderboard",
    artKey: "leaderboard_panel",
    robloxAssetId: "130675384010731",
    localPath: "/roblox-assets/UI/leaderboard-main.png",
    sourceStatus: "mapped"
  },
  active_event_panel: {
    key: "active_event_panel",
    label: "Active event panel",
    viteUsage: "Right column active event",
    artKey: "active_event_panel",
    robloxAssetId: "88733035792020",
    localPath: "/roblox-assets/UI/current-event.png",
    sourceStatus: "mapped"
  },
  dashboard_event_background: {
    key: "dashboard_event_background",
    label: "Dashboard event background",
    viteUsage: "Right column active event",
    artKey: "active_event_panel",
    robloxAssetId: "88733035792020",
    localPath: "/roblox-assets/UI/current-event.png",
    sourceStatus: "mapped"
  },
  active_event_sub_layer: {
    key: "active_event_sub_layer",
    label: "Active event sub layer",
    viteUsage: "Right column active event interior",
    artKey: "active_event_sub_layer",
    robloxAssetId: "75304753948939",
    localPath: "/roblox-assets/UI/event-layer-2.png",
    sourceStatus: "mapped"
  },
  event_activate_button: {
    key: "event_activate_button",
    label: "Event activate button",
    viteUsage: "Right column active event button",
    artKey: "event_activate_button",
    robloxAssetId: "136020107961949",
    localPath: "/roblox-assets/buttons/event-button.png",
    sourceStatus: "mapped"
  },
  alignment_panel: {
    key: "alignment_panel",
    label: "Alignment panel",
    viteUsage: "Right column alignment",
    artKey: "alignment_panel",
    robloxAssetId: "133827934088512",
    localPath: "/roblox-assets/UI/alignment-background.png",
    sourceStatus: "mapped"
  },
  dashboard_alignment_background: {
    key: "dashboard_alignment_background",
    label: "Dashboard alignment background",
    viteUsage: "Right column alignment",
    artKey: "alignment_panel",
    robloxAssetId: "133827934088512",
    localPath: "/roblox-assets/UI/alignment-background.png",
    sourceStatus: "mapped"
  }
} as const satisfies Record<string, DashboardArtRegistryEntry>;

export type DashboardArtKey = keyof typeof DASHBOARD_ART_REGISTRY;

function findCanonicalAsset(assets: AssetDefinition[], entry: DashboardArtRegistryEntry) {
  return assets.find((asset) => {
    return asset.artKey === entry.artKey || asset.artKey === entry.iconKey || asset.id === entry.artKey || asset.id === entry.iconKey || asset.name === entry.artKey || asset.name === entry.iconKey;
  });
}

function isExportedRobloxArtPlaceholder(path: string | undefined) {
  return path?.startsWith("/assets/roblox-art/") === true;
}

export function resolveDashboardArt(assets: AssetDefinition[], key: DashboardArtKey): DashboardArtResolution {
  const entry: DashboardArtRegistryEntry = DASHBOARD_ART_REGISTRY[key];
  const canonical = findCanonicalAsset(assets, entry);
  const platformWebPath = canonical?.platformMappings?.web?.path;
  const warnings: string[] = [];

  if (entry.sourceStatus === "source-missing") warnings.push("Source Missing");
  if (entry.sourceStatus === "replacement-required" || entry.robloxAssetId === "0") warnings.push("Replacement Required");

  if (platformWebPath && !isExportedRobloxArtPlaceholder(platformWebPath)) {
    return {
      ...entry,
      kind: "web-path",
      path: platformWebPath,
      canonicalAssetId: canonical?.id,
      platformWebPath,
      mappingStatus: "canonical-web",
      warnings
    };
  }

  if (entry.localPath) {
    return {
      ...entry,
      kind: "local-registry",
      path: entry.localPath,
      canonicalAssetId: canonical?.id,
      platformWebPath,
      mappingStatus: "local-fallback",
      warnings
    };
  }

  return {
    ...entry,
    kind: "placeholder",
    canonicalAssetId: canonical?.id,
    platformWebPath,
    mappingStatus: "missing",
    warnings: warnings.length ? warnings : ["Missing Mapping"]
  };
}

export function createDashboardArtMap(assets: AssetDefinition[]) {
  return Object.fromEntries(
    (Object.keys(DASHBOARD_ART_REGISTRY) as DashboardArtKey[]).map((key) => [key, resolveDashboardArt(assets, key)])
  ) as Record<DashboardArtKey, DashboardArtResolution>;
}

export function getDashboardArtAudit(assets: AssetDefinition[]) {
  return (Object.keys(DASHBOARD_ART_REGISTRY) as DashboardArtKey[]).map((key) => resolveDashboardArt(assets, key));
}

export function dashboardAssetFailureDiagnostic(art: DashboardArtResolution | undefined, failedUrl: string) {
  return {
    key: art?.key ?? "unknown",
    canonicalWebUrl: art?.platformWebPath ?? "",
    localFallbackUrl: art?.localPath ?? "",
    resolvedUrl: failedUrl,
    fallbackUsed: art?.mappingStatus === "local-fallback"
  };
}
