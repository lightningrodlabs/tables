import { defineConfig } from '@theweave/cli';

export default defineConfig({
  toolCurations: [
    {
      url: 'https://raw.githubusercontent.com/lightningrodlabs/weave-tool-curation/refs/heads/main/0.16/lists/curations-0.16.json',
      useLists: ['default'],
    },
  ],
  groups: [
    {
      name: 'Lightning Rod Labs',
      networkSeed: '098rc1m-09384u-crm-29384u-cmkj',
      icon: {
        type: 'filesystem',
        path: './weave/lrl-icon.png',
      },
      creatingAgent: {
        agentIdx: 1,
        agentProfile: {
          nickname: 'Zippy',
          avatar: {
            type: 'filesystem',
            path: './weave/zippy.jpg',
          },
        },
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: {
            nickname: 'Zerbina',
            avatar: {
              type: 'filesystem',
              path: './weave/zerbina.jpg',
            },
          },
        },
      ],
      applets: [
        {
          name: 'Tables Hot Reload',
          instanceName: 'Tables Hot Reload',
          registeringAgent: 1,
          joiningAgents: [2],
        },
        // {
        //   name: 'gamez',
        //   instanceName: 'gamez',
        //   registeringAgent: 1,
        //   joiningAgents: [2],
        // },
        // {
        //   name: 'kando',
        //   instanceName: 'kando',
        //   registeringAgent: 1,
        //   joiningAgents: [2],
        // },
      ],
    },
  ],
  applets: [
    {
      name: 'Tables Hot Reload',
      subtitle: 'Tables',
      description: 'store it!',
      icon: {
        type: 'filesystem',
        path: './weave/datatubmini.svg',
      },
      source: {
        type: 'localhost',
        happPath: './workdir/tables.happ',
        uiPort: 8888,
      },
    },
    // ---------------------------------------------------------------------
    // The kando / gamez / notebooks entries below are commented out for the
    // Holochain 0.7 line. Their published webhapps (kando v0.9.3,
    // gamez v0.4.2, notebooks v0.2.4) are all built against Holochain 0.6 and
    // a 0.7 Moss cannot install them -- the dev launch dies before this tool
    // is ever reached. The matching groups[].applets entries were already
    // commented out on the 0.6 line.
    // RE-ENABLE each one individually once that tool has published a
    // Holochain-0.7 webhapp, updating the version in its URL.
    // ---------------------------------------------------------------------
//     {
//       name: 'kando',
//       subtitle: 'KanDo',
//       description: 'task it it!',
//       icon: {
//         type: 'https',
//         url: 'https://raw.githubusercontent.com/holochain-apps/gamez/main/we_dev/gamez_icon.svg',
//       },
//       source: {
//         type: 'https',
//         url: 'https://github.com/holochain-apps/kando/releases/download/v0.9.3/kando.webhapp',
//       },
//     },
//     {
//         name: 'gamez',
//         subtitle: 'play!',
//         description: 'Real-time games based on syn',
//         icon: {
//           type: "https",
//           url: "https://raw.githubusercontent.com/holochain-apps/gamez/main/we_dev/gamez_icon.svg"
//         },
//         source: {
//           type: "https",
//           url: "https://github.com/holochain-apps/gamez/releases/download/v0.4.2/gamez.webhapp"
//         },
//       },
//       {
//       name: 'notebooks',
//       subtitle: 'Collaborative note taking',
//       description: 'Real-time notetaking based on syn',
//       icon: {
//         type: 'https',
//         url: 'https://lightningrodlabs.org/projects/notebooks.png',
//       },
//       source: {
//         type: 'https',
//         url: 'https://github.com/lightningrodlabs/notebooks/releases/download/v0.2.4/notebooks.webhapp',
//       },
//     },
  ],
});