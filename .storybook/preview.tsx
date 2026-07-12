import type { Decorator, Preview } from "@storybook/react";
import React from "react";
import "../src/index.css";
import { GenesisStoryContentProvider } from "../src/stories/storybook-content-provider";

const withGenesisContent: Decorator = (Story, context) => (
  <GenesisStoryContentProvider globals={context.globals}>
    <Story />
  </GenesisStoryContentProvider>
);

const preview: Preview = {
  decorators: [withGenesisContent],
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "genesis",
      values: [
        { name: "genesis", value: "#080b12" },
        { name: "deep space", value: "#020617" }
      ]
    },
    viewport: {
      viewports: {
        desktop1080: {
          name: "1920 x 1080",
          styles: { width: "1920px", height: "1080px" }
        },
        desktop900: {
          name: "1440 x 900",
          styles: { width: "1440px", height: "900px" }
        },
        tablet768: {
          name: "1024 x 768",
          styles: { width: "1024px", height: "768px" }
        }
      }
    }
  },
  globalTypes: {
    contentSource: {
      name: "Content Source",
      defaultValue: "full",
      toolbar: {
        icon: "database",
        items: [
          { value: "full", title: "Full Snapshot" },
          { value: "mock", title: "Mock" }
        ],
        dynamicTitle: true
      }
    },
    eraId: {
      name: "Era",
      defaultValue: "survival",
      toolbar: {
        icon: "time",
        items: [
          { value: "survival", title: "Survival" },
          { value: "ancient", title: "Ancient" },
          { value: "medieval", title: "Medieval" },
          { value: "renaissance", title: "Renaissance" },
          { value: "industrial", title: "Industrial" },
          { value: "modern", title: "Modern" },
          { value: "space-age", title: "Space Age" },
          { value: "interstellar", title: "Interstellar" },
          { value: "galactic", title: "Galactic" }
        ],
        dynamicTitle: true
      }
    },
    upgradeCategoryId: {
      name: "Upgrade Category",
      defaultValue: "workforce",
      toolbar: {
        icon: "component",
        items: [
          { value: "workforce", title: "Workforce" },
          { value: "industry", title: "Industry" },
          { value: "science", title: "Science" },
          { value: "technology", title: "Technology" }
        ],
        dynamicTitle: true
      }
    },
    artStatus: {
      name: "Art Status",
      defaultValue: "all",
      toolbar: {
        icon: "photo",
        items: [
          { value: "all", title: "All" },
          { value: "final", title: "Final" },
          { value: "draft", title: "Draft" },
          { value: "placeholder", title: "Placeholder" },
          { value: "missing", title: "Missing" }
        ],
        dynamicTitle: true
      }
    },
    targetViewport: {
      name: "Viewport",
      defaultValue: "1920",
      toolbar: {
        icon: "browser",
        items: [
          { value: "1920", title: "1920 x 1080" },
          { value: "1440", title: "1440 x 900" },
          { value: "1024", title: "1024 x 768" }
        ],
        dynamicTitle: true
      }
    },
    reducedMotion: {
      name: "Reduced Motion",
      defaultValue: false,
      toolbar: {
        icon: "stop",
        items: [
          { value: false, title: "Motion" },
          { value: true, title: "Reduced" }
        ],
        dynamicTitle: true
      }
    }
  }
};

export default preview;
