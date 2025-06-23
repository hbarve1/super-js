import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    'intro',
    'language-reference',
    'examples',
    'type-system',
    'tooling',
    {
      type: 'category',
      label: 'Changelog',
      items: [
        'changelog',
        'changelog/0.2.0',
        'changelog/0.1.0',
        'changelog/0.0.1',
      ],
    },
    'roadmap',
    'specification',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],

  // Current version sidebar (when versioning is enabled)
  'version-0.2.0-docs': [
    'intro',
    'language-reference',
    'examples',
    'type-system',
    'tooling',
    {
      type: 'category',
      label: 'Changelog',
      items: [
        'changelog',
        'changelog/0.2.0',
        'changelog/0.1.0',
        'changelog/0.0.1',
      ],
    },
    'roadmap',
    'specification',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
